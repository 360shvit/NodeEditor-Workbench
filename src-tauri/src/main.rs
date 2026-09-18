#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use notify::{event::ModifyKind, Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Component, Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{ipc::InvokeBody, ipc::Request, ipc::Response, AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_window_state::StateFlags;
use tauri_plugin_updater::{Update, UpdaterExt};

const MAX_PROJECT_ENTRIES: usize = 100_000;
const MAX_JSON_FILES: usize = 50_000;
const MAX_JSON_FILE_BYTES: u64 = 64 * 1024 * 1024;
const MAX_TOTAL_JSON_BYTES: u64 = 512 * 1024 * 1024;
const MAX_JSON_NESTING: usize = 512;
const MAX_APPLY_FILES: usize = 10_000;
const RECENT_GRANTS_FILE: &str = "recent-project-grants.json";
const TRANSACTION_JOURNAL_FILE: &str = "apply-transaction.json";
const TRANSACTION_COMMIT_FILE: &str = "apply-transaction.commit";
const DISCOVERY_PROFILES_FILE: &str = "semantic-discovery-profiles.json";
const MAX_DISCOVERY_PROBE_FILES: usize = 10_000;
const MAX_DISCOVERY_PROBE_FILE_BYTES: u64 = 8 * 1024 * 1024;
const MAX_DISCOVERY_PROBE_TOTAL_BYTES: u64 = 128 * 1024 * 1024;
const MAX_SOURCE_PREVIEW_BYTES: u64 = 4 * 1024 * 1024;
const PERSISTENT_LOG_FILE: &str = "workbench-current.jsonl";
const PERSISTENT_LOG_ROTATED_PREFIX: &str = "workbench";
const PERSISTENT_LOG_MAX_FILE_BYTES: u64 = 2 * 1024 * 1024;
const PERSISTENT_LOG_RETAINED_FILES: usize = 4;
const PERSISTENT_LOG_MAX_BATCH_ENTRIES: usize = 100;
const PERSISTENT_LOG_MAX_ENTRY_BYTES: usize = 16 * 1024;
const PERSISTENT_LOG_MAX_BATCH_BYTES: usize = 1024 * 1024;
const WORLDGEN_LOG_SCAN_CHUNK_BYTES: u64 = 1024 * 1024;
const WORLDGEN_REPORT_CANDIDATE_MAX_BYTES: u64 = 8 * 1024 * 1024;
const WORLDGEN_PERFORMANCE_MARKER: &str = "[HytaleGenerator] Performance Report";
const UPDATER_PUBLIC_KEY: &str = include_str!("../updater.pubkey");
const UPDATER_REPOSITORY: &str = match option_env!("HGW_GITHUB_REPOSITORY") {
    Some(value) => value,
    None => "",
};
const UPDATER_DISTRIBUTION_KIND: &str = match option_env!("HGW_DISTRIBUTION_KIND") {
    Some(value) => value,
    None => "",
};

#[derive(Clone, Debug)]
struct ProjectState {
    root: PathBuf,
    canonical_root: PathBuf,
    discovery_roots: Vec<String>,
}

#[derive(Clone, Debug)]
struct SuppressedWrite {
    expected: String,
    until: Instant,
}

#[derive(Clone, Debug)]
enum WorldgenLogSource {
    File(PathBuf),
    Folder(PathBuf),
}

#[derive(Clone, Copy, Debug)]
enum SaveTargetKind {
    Zip,
    SupportJson,
}

#[derive(Clone, Debug)]
struct RegisteredSaveTarget {
    path: PathBuf,
    canonical_parent: PathBuf,
    kind: SaveTargetKind,
}

#[derive(Clone)]
struct PendingUpdate {
    channel: String,
    update: Update,
}

#[derive(Default)]
struct PendingUpdateState {
    update: Mutex<Option<PendingUpdate>>,
}

#[derive(Default)]
struct DesktopState {
    project: Mutex<Option<ProjectState>>,
    output_roots: Mutex<HashMap<String, PathBuf>>,
    save_targets: Mutex<HashMap<String, RegisteredSaveTarget>>,
    worldgen_logs: Mutex<HashMap<String, WorldgenLogSource>>,
    recent_grants: Mutex<HashSet<PathBuf>>,
    next_token: AtomicU64,
    watcher: Mutex<Option<RecommendedWatcher>>,
    watch_suppression: Arc<Mutex<HashMap<PathBuf, SuppressedWrite>>>,
    active_write_paths: Arc<Mutex<HashSet<PathBuf>>>,
    apply_transaction_lock: Mutex<()>,
    persistent_log_lock: Mutex<()>,
    pending_change_count: AtomicU64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RootPayload {
    root: String,
    trace_id: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct TracePayload {
    trace_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TextFile {
    path: String,
    text: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SemanticFileInfo {
    path: String,
    format: String,
    domain: String,
    role: String,
    workspace: Option<String>,
    workspace_id: Option<String>,
    discovery_source: String,
    detector: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectProbeResult {
    scan: ProjectScan,
    probed_root: String,
    detected: Vec<SemanticFileInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTextPreview {
    path: String,
    size: u64,
    kind: String,
    text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DiscoveryProfiles {
    projects: HashMap<String, Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FilesPayload {
    files: Vec<TextFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApplyFile {
    path: String,
    expected: String,
    text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApplyPayload {
    files: Vec<ApplyFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OutputPathsPayload {
    token: String,
    paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportPayload {
    token: String,
    scope: String,
    changed_files: Vec<TextFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectPathPayload {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectProbePayload {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SuggestedSavePayload {
    suggested_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PendingChangesPayload {
    count: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateChannelPayload {
    channel: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstallUpdatePayload {
    channel: String,
    expected_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckResult {
    configured: bool,
    channel: String,
    current_version: String,
    available: bool,
    version: Option<String>,
    notes: Option<String>,
    pub_date: Option<String>,
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateInstallResult {
    started: bool,
    version: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppUpdateProgress {
    phase: String,
    version: String,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistentLogBatchPayload {
    entries: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistentLogStatus {
    enabled: bool,
    format: &'static str,
    current_file: &'static str,
    max_file_bytes: u64,
    retained_files: usize,
    current_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PendingChangesResult {
    pending_changes: u64,
}

#[derive(Debug, Serialize)]
struct ClosedResult {
    closed: bool,
}

#[derive(Debug, Serialize)]
struct ExitingResult {
    exiting: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppCloseRequested {
    pending_changes: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NativeTracePhase {
    name: String,
    duration_ms: f64,
    data: HashMap<String, u64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NativeProjectTrace {
    trace_id: Option<String>,
    phases: Vec<NativeTracePhase>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectScan {
    root: String,
    label: String,
    files: Vec<TextFile>,
    entries: Vec<String>,
    semantic_files: Vec<SemanticFileInfo>,
    discovery_roots: Vec<String>,
    native_trace: Option<NativeProjectTrace>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProjectFilesChanged {
    root: String,
    paths: Vec<String>,
    kind: String,
}

#[derive(Debug, Serialize)]
struct ConflictsResult {
    conflicts: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplyResult {
    conflicts: Vec<String>,
    written: usize,
}

#[derive(Debug, Serialize)]
struct WrittenResult {
    written: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutputDirectoryResult {
    kind: &'static str,
    token: String,
    name: String,
    is_source: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveTargetResult {
    token: String,
    name: String,
}

#[derive(Debug, Serialize)]
struct ExistingResult {
    existing: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorldgenLogPayload {
    token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorldgenLogSelection {
    token: String,
    name: String,
    source_kind: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorldgenStageMetric {
    name: String,
    stage: u32,
    duration_ms: f64,
    preparation_ms: Option<f64>,
    execution_ms: Option<f64>,
    async_processes_start_ms: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorldgenNamedTimingMetric {
    label: String,
    duration_ms: f64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorldgenMemoryGridMetric {
    name: String,
    index: i32,
    memory_footprint_mb: Option<f64>,
    buffer_count: Option<u64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorldgenContextDependencyMetric {
    name: String,
    stage: u32,
    output_buffer_x: Option<f64>,
    output_buffer_z: Option<f64>,
    output_chunk_x: Option<f64>,
    output_chunk_z: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorldgenPerformanceReport {
    timestamp: String,
    sample_count: u64,
    world_structure_name: String,
    total_ms: f64,
    content_generation_ms: f64,
    access_initialization_ms: Option<f64>,
    data_transfer_ms: f64,
    data_transfer_timings: Vec<WorldgenNamedTimingMetric>,
    buffers_memory_mb: f64,
    memory_grids: Vec<WorldgenMemoryGridMetric>,
    context_dependencies: Vec<WorldgenContextDependencyMetric>,
    total_cache_buffer_requests: u64,
    missed_cache_buffer_requests: u64,
    missed_total_ratio_percent: f64,
    stages: Vec<WorldgenStageMetric>,
    raw_report: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorldgenPerformanceResult {
    name: String,
    bytes_scanned: u64,
    lines_scanned: usize,
    truncated: bool,
    report: Option<WorldgenPerformanceReport>,
}

fn io_error(context: &str, error: impl std::fmt::Display) -> String {
    format!("{context}: {error}")
}

fn path_label(path: &Path) -> String {
    path.file_name()
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

fn worldgen_payload_line(line: &str) -> &str {
    line.split_once("|SERVER - ").map(|(_, payload)| payload).unwrap_or(line).trim_end()
}

fn parse_metric_value(line: &str, prefix: &str, suffix: &str) -> Option<f64> {
    let trimmed = worldgen_payload_line(line).trim();
    let value = trimmed.strip_prefix(prefix)?.trim().strip_suffix(suffix)?.trim();
    value.parse::<f64>().ok()
}

fn parse_u64_value(line: &str, prefix: &str) -> Option<u64> {
    worldgen_payload_line(line).trim().strip_prefix(prefix)?.trim().parse::<u64>().ok()
}

fn parse_worldgen_stage_identity(line: &str) -> Option<(String, u32)> {
    let trimmed = worldgen_payload_line(line).trim();
    let stage_marker = trimmed.find(" (Stage ")?;
    let name = trimmed[..stage_marker].trim();
    if name.is_empty() { return None; }
    let rest = &trimmed[stage_marker + 8..];
    let close = rest.find("):")?;
    let stage = rest[..close].trim().parse::<u32>().ok()?;
    Some((name.to_string(), stage))
}

fn parse_worldgen_stage(line: &str) -> Option<WorldgenStageMetric> {
    let trimmed = worldgen_payload_line(line).trim();
    let (name, stage) = parse_worldgen_stage_identity(line)?;
    let close = trimmed.find("):")?;
    let duration = trimmed[close + 2..].trim().strip_suffix("ms")?.trim().parse::<f64>().ok()?;
    Some(WorldgenStageMetric {
        name,
        stage,
        duration_ms: duration,
        preparation_ms: None,
        execution_ms: None,
        async_processes_start_ms: None,
    })
}

fn parse_worldgen_named_timing(line: &str) -> Option<WorldgenNamedTimingMetric> {
    let trimmed = worldgen_payload_line(line).trim();
    let (label, raw_value) = trimmed.rsplit_once(':')?;
    let duration_ms = raw_value.trim().strip_suffix("ms")?.trim().parse::<f64>().ok()?;
    let label = label.trim();
    if label.is_empty() { return None; }
    Some(WorldgenNamedTimingMetric { label: label.to_string(), duration_ms })
}

fn parse_worldgen_grid_header(line: &str) -> Option<(String, i32)> {
    let trimmed = worldgen_payload_line(line).trim();
    let marker = " (Index ";
    let marker_index = trimmed.find(marker)?;
    let close = trimmed[marker_index + marker.len()..].find("):")? + marker_index + marker.len();
    let name = trimmed[..marker_index].trim();
    let index = trimmed[marker_index + marker.len()..close].trim().parse::<i32>().ok()?;
    if name.is_empty() { return None; }
    Some((name.to_string(), index))
}

fn parse_worldgen_vector(line: &str, prefix: &str) -> Option<(f64, f64)> {
    let trimmed = worldgen_payload_line(line).trim();
    let raw = trimmed.strip_prefix(prefix)?.trim();
    let raw = raw.strip_prefix('{')?.strip_suffix('}')?;
    let mut x = None;
    let mut z = None;
    for part in raw.split(',') {
        let (key, value) = part.trim().split_once('=')?;
        match key.trim() {
            "x" => x = value.trim().parse::<f64>().ok(),
            "z" => z = value.trim().parse::<f64>().ok(),
            _ => {}
        }
    }
    Some((x?, z?))
}

fn parse_worldgen_report(lines: &[&str], marker_index: usize) -> Option<WorldgenPerformanceReport> {
    let end = lines.iter().enumerate().skip(marker_index + 1)
        .find(|(_, line)| worldgen_payload_line(line).starts_with('['))
        .map(|(index, _)| index)
        .unwrap_or(lines.len());
    let block = &lines[marker_index..end];
    if !block.iter().any(|line| worldgen_payload_line(line).trim().starts_with("Missed/Total Ratio:")) {
        return None;
    }

    let marker = worldgen_payload_line(block.first()?).trim();
    let timestamp = marker.get(1..20).unwrap_or("").trim().to_string();
    let sample_count = block.iter().find_map(|line| parse_u64_value(line, "Sample Count:"))?;
    let world_structure_name = block.iter().find_map(|line| worldgen_payload_line(line).trim().strip_prefix("WorldStructure Name:").map(|v| v.trim().to_string()))?;
    let total_ms = block.iter().find_map(|line| parse_metric_value(line, "Total:", "ms"))?;
    let content_generation_ms = block.iter().find_map(|line| parse_metric_value(line, "Content Generation:", "ms"))?;
    let access_initialization_ms = block.iter().find_map(|line| parse_metric_value(line, "Access Initialization:", "ms"));
    let data_transfer_ms = block.iter().find_map(|line| parse_metric_value(line, "Data Transfer:", "ms"))?;
    let buffers_memory_mb = block.iter().find_map(|line| parse_metric_value(line, "Buffers Memory Usage:", "mb"))?;
    let total_cache_buffer_requests = block.iter().find_map(|line| parse_u64_value(line, "Total Cache Buffer Requests:"))?;
    let missed_cache_buffer_requests = block.iter().find_map(|line| parse_u64_value(line, "Missed Cache Buffer Requests:"))?;
    let missed_total_ratio_percent = block.iter().find_map(|line| parse_metric_value(line, "Missed/Total Ratio:", "%"))?;

    let mut stages: Vec<WorldgenStageMetric> = Vec::new();
    for line in block {
        if let Some(stage) = parse_worldgen_stage(line) {
            stages.push(stage);
            continue;
        }
        let Some(current) = stages.last_mut() else { continue; };
        if let Some(value) = parse_metric_value(line, "Preparation:", "ms") { current.preparation_ms = Some(value); continue; }
        if let Some(value) = parse_metric_value(line, "Execution:", "ms") { current.execution_ms = Some(value); continue; }
        if let Some(value) = parse_metric_value(line, "Async Processes Start:", "ms") { current.async_processes_start_ms = Some(value); }
    }

    let data_transfer_index = block.iter().position(|line| worldgen_payload_line(line).trim().starts_with("Data Transfer:"));
    let memory_report_index = block.iter().position(|line| worldgen_payload_line(line).trim() == "Memory Usage Report").unwrap_or(block.len());
    let data_transfer_timings = data_transfer_index
        .map(|index| block[index + 1..memory_report_index].iter().filter_map(|line| parse_worldgen_named_timing(line)).collect())
        .unwrap_or_default();

    let context_report_index = block.iter().position(|line| worldgen_payload_line(line).trim() == "Context Dependency Report").unwrap_or(block.len());
    let mut memory_grids = Vec::new();
    if memory_report_index < context_report_index {
        let memory_lines = &block[memory_report_index + 1..context_report_index];
        let mut index = 0;
        while index < memory_lines.len() {
            let Some((name, grid_index)) = parse_worldgen_grid_header(memory_lines[index]) else {
                index += 1;
                continue;
            };
            let mut memory_footprint_mb = None;
            let mut buffer_count = None;
            index += 1;
            while index < memory_lines.len() && parse_worldgen_grid_header(memory_lines[index]).is_none() {
                if memory_footprint_mb.is_none() {
                    memory_footprint_mb = parse_metric_value(memory_lines[index], "Memory Footprint:", "mb");
                }
                if buffer_count.is_none() {
                    buffer_count = parse_u64_value(memory_lines[index], "Buffer Count:");
                }
                index += 1;
            }
            memory_grids.push(WorldgenMemoryGridMetric {
                name,
                index: grid_index,
                memory_footprint_mb,
                buffer_count,
            });
        }
    }

    let cache_report_index = block.iter().position(|line| worldgen_payload_line(line).trim() == "Buffer Cache Report").unwrap_or(block.len());
    let mut context_dependencies = Vec::new();
    if context_report_index < cache_report_index {
        let context_lines = &block[context_report_index + 1..cache_report_index];
        let mut index = 0;
        while index < context_lines.len() {
            let Some((name, stage)) = parse_worldgen_stage_identity(context_lines[index]) else {
                index += 1;
                continue;
            };
            let mut metric = WorldgenContextDependencyMetric {
                name,
                stage,
                output_buffer_x: None,
                output_buffer_z: None,
                output_chunk_x: None,
                output_chunk_z: None,
            };
            index += 1;
            while index < context_lines.len() && parse_worldgen_stage_identity(context_lines[index]).is_none() {
                if let Some((x, z)) = parse_worldgen_vector(context_lines[index], "Output Size (Buffer Column):") {
                    metric.output_buffer_x = Some(x);
                    metric.output_buffer_z = Some(z);
                }
                if let Some((x, z)) = parse_worldgen_vector(context_lines[index], "Output Size (Chunk Column):") {
                    metric.output_chunk_x = Some(x);
                    metric.output_chunk_z = Some(z);
                }
                index += 1;
            }
            context_dependencies.push(metric);
        }
    }

    Some(WorldgenPerformanceReport {
        timestamp,
        sample_count,
        world_structure_name,
        total_ms,
        content_generation_ms,
        access_initialization_ms,
        data_transfer_ms,
        data_transfer_timings,
        buffers_memory_mb,
        memory_grids,
        context_dependencies,
        total_cache_buffer_requests,
        missed_cache_buffer_requests,
        missed_total_ratio_percent,
        stages,
        raw_report: block.iter().map(|line| worldgen_payload_line(line)).collect::<Vec<_>>().join("\n").trim_end().to_string(),
    })
}

fn worldgen_line_start(file: &mut File, position: u64) -> Result<u64, String> {
    const SEARCH_BYTES: usize = 4096;
    let mut cursor = position;
    let mut buffer = vec![0u8; SEARCH_BYTES];
    while cursor > 0 {
        let start = cursor.saturating_sub(SEARCH_BYTES as u64);
        let len = (cursor - start) as usize;
        file.seek(SeekFrom::Start(start)).map_err(|error| io_error("Cannot seek selected WorldGen log", error))?;
        file.read_exact(&mut buffer[..len]).map_err(|error| io_error("Cannot read selected WorldGen log", error))?;
        if let Some(index) = buffer[..len].iter().rposition(|byte| *byte == b'\n') {
            return Ok(start + index as u64 + 1);
        }
        cursor = start;
    }
    Ok(0)
}

fn read_worldgen_report_at(file: &mut File, marker_position: u64) -> Result<Option<WorldgenPerformanceReport>, String> {
    let line_start = worldgen_line_start(file, marker_position)?;
    file.seek(SeekFrom::Start(line_start)).map_err(|error| io_error("Cannot seek selected WorldGen log", error))?;
    // The whole log remains unbounded and is still searched back to BOF. Only one
    // malformed report candidate is bounded so a missing terminator cannot materialize
    // arbitrary amounts of later spam in memory. The +1 byte lets us distinguish a
    // candidate that exactly fits from one that actually exceeds the contract.
    let mut reader = BufReader::new(file).take(WORLDGEN_REPORT_CANDIDATE_MAX_BYTES.saturating_add(1));
    let mut lines = Vec::new();
    let mut found_marker = false;
    let mut candidate_bytes = 0u64;
    loop {
        let mut line = String::new();
        let read = reader.read_line(&mut line).map_err(|error| io_error("Cannot read selected WorldGen log", error))?;
        if read == 0 { break; }
        candidate_bytes = candidate_bytes.saturating_add(read as u64);
        if candidate_bytes > WORLDGEN_REPORT_CANDIDATE_MAX_BYTES {
            return Ok(None);
        }
        while matches!(line.as_bytes().last(), Some(b'\n' | b'\r')) { line.pop(); }
        let payload = worldgen_payload_line(&line);
        if !found_marker {
            if !payload.contains(WORLDGEN_PERFORMANCE_MARKER) { continue; }
            found_marker = true;
            lines.push(line);
            continue;
        }
        if payload.starts_with('[') && !payload.contains(WORLDGEN_PERFORMANCE_MARKER) {
            break;
        }
        let complete = payload.trim().starts_with("Missed/Total Ratio:");
        lines.push(line);
        if complete { break; }
    }
    if !found_marker { return Ok(None); }
    let refs = lines.iter().map(String::as_str).collect::<Vec<_>>();
    Ok(parse_worldgen_report(&refs, 0))
}

fn read_worldgen_performance_log(path: &Path) -> Result<(u64, usize, bool, Option<WorldgenPerformanceReport>), String> {
    let mut file = File::open(path).map_err(|error| io_error("Cannot open selected WorldGen log", error))?;
    let file_len = file.metadata().map_err(|error| io_error("Cannot inspect selected WorldGen log", error))?.len();
    let marker = WORLDGEN_PERFORMANCE_MARKER.as_bytes();
    let overlap_len = marker.len().saturating_sub(1);
    let mut cursor = file_len;
    let mut later_prefix = Vec::new();
    let mut bytes_scanned = 0u64;
    let mut newline_count = 0usize;

    while cursor > 0 {
        let start = cursor.saturating_sub(WORLDGEN_LOG_SCAN_CHUNK_BYTES);
        let len = (cursor - start) as usize;
        let mut chunk = vec![0u8; len];
        file.seek(SeekFrom::Start(start)).map_err(|error| io_error("Cannot seek selected WorldGen log", error))?;
        file.read_exact(&mut chunk).map_err(|error| io_error("Cannot read selected WorldGen log", error))?;
        bytes_scanned = bytes_scanned.saturating_add(len as u64);
        newline_count = newline_count.saturating_add(chunk.iter().filter(|byte| **byte == b'\n').count());

        let mut search = Vec::with_capacity(chunk.len() + later_prefix.len());
        search.extend_from_slice(&chunk);
        search.extend_from_slice(&later_prefix);
        let mut search_end = search.len();
        while search_end >= marker.len() {
            let Some(index) = search[..search_end].windows(marker.len()).rposition(|window| window == marker) else { break; };
            if index < chunk.len() {
                let marker_position = start + index as u64;
                if let Some(report) = read_worldgen_report_at(&mut file, marker_position)? {
                    let lines_scanned = newline_count.saturating_add(usize::from(bytes_scanned > 0));
                    return Ok((bytes_scanned, lines_scanned, false, Some(report)));
                }
            }
            if index == 0 { break; }
            search_end = index;
        }

        later_prefix = chunk[..chunk.len().min(overlap_len)].to_vec();
        cursor = start;
    }

    let lines_scanned = newline_count.saturating_add(usize::from(file_len > 0));
    Ok((bytes_scanned, lines_scanned, false, None))
}

fn relative_display(root: &Path, path: &Path) -> Result<String, String> {
    let relative = path
        .strip_prefix(root)
        .map_err(|_| "Path escaped the selected project root.".to_string())?;
    Ok(relative
        .components()
        .filter_map(|component| match component {
            Component::Normal(value) => Some(value.to_string_lossy().to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/"))
}

fn safe_relative(raw: &str) -> Result<PathBuf, String> {
    if raw.contains('\0') {
        return Err("Invalid NUL byte in relative path.".to_string());
    }
    let normalized = raw.replace('\\', "/");
    if normalized.starts_with('/') || normalized.is_empty() {
        return Err(format!("Invalid relative path: {raw}"));
    }
    let mut result = PathBuf::new();
    for component in Path::new(&normalized).components() {
        match component {
            Component::Normal(value) => result.push(value),
            _ => return Err(format!("Unsafe relative path rejected: {raw}")),
        }
    }
    if result.as_os_str().is_empty() {
        return Err(format!("Invalid relative path: {raw}"));
    }
    Ok(result)
}

fn sorted_directory_entries(directory: &Path) -> Result<Vec<fs::DirEntry>, String> {
    let mut entries = fs::read_dir(directory)
        .map_err(|error| io_error(&format!("Cannot read {}", directory.display()), error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| io_error(&format!("Cannot enumerate {}", directory.display()), error))?;
    entries.sort_by_key(|entry| entry.file_name().to_string_lossy().to_lowercase());
    Ok(entries)
}

fn transaction_suffix(name: &str) -> Option<(&str, &str, &str)> {
    let marker = ".hgw-txn-";
    let index = name.rfind(marker)?;
    let prefix = &name[..index];
    let tail = &name[index + marker.len()..];
    let (id, kind) = tail.rsplit_once('.')?;
    if id.is_empty() || (kind != "bak" && kind != "tmp") || !prefix.starts_with('.') {
        return None;
    }
    Some((&prefix[1..], id, kind))
}

fn is_transaction_artifact(path: &Path) -> bool {
    path.file_name()
        .and_then(|value| value.to_str())
        .map(|name| transaction_suffix(name).is_some())
        .unwrap_or(false)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ApplyRecoveryJournal {
    project_root: String,
    txn_id: u64,
    files: Vec<String>,
    #[serde(default)]
    intended_fingerprints: HashMap<String, u64>,
}

fn app_data_file(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| io_error("Cannot resolve app-data directory", error))?;
    fs::create_dir_all(&directory).map_err(|error| io_error("Cannot create app-data directory", error))?;
    Ok(directory.join(name))
}

fn persistent_log_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_log_dir().map_err(|error| io_error("Cannot resolve app-log directory", error))?;
    fs::create_dir_all(&directory).map_err(|error| io_error("Cannot create app-log directory", error))?;
    let metadata = fs::symlink_metadata(&directory).map_err(|error| io_error("Cannot inspect app-log directory", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("Refusing unsafe app-log directory.".to_string());
    }
    Ok(directory)
}

fn persistent_log_path(directory: &Path, generation: usize) -> PathBuf {
    if generation == 0 {
        directory.join(PERSISTENT_LOG_FILE)
    } else {
        directory.join(format!("{PERSISTENT_LOG_ROTATED_PREFIX}-{generation}.jsonl"))
    }
}

fn inspect_persistent_log_file(path: &Path) -> Result<u64, String> {
    if !path.exists() { return Ok(0); }
    let metadata = fs::symlink_metadata(path).map_err(|error| io_error("Cannot inspect persistent log", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Refusing unsafe persistent log target.".to_string());
    }
    Ok(metadata.len())
}

fn rotate_persistent_logs(directory: &Path) -> Result<(), String> {
    let last = persistent_log_path(directory, PERSISTENT_LOG_RETAINED_FILES.saturating_sub(1));
    if last.exists() {
        inspect_persistent_log_file(&last)?;
        fs::remove_file(&last).map_err(|error| io_error("Cannot remove oldest persistent log", error))?;
    }
    for generation in (1..PERSISTENT_LOG_RETAINED_FILES.saturating_sub(1)).rev() {
        let source = persistent_log_path(directory, generation);
        if !source.exists() { continue; }
        inspect_persistent_log_file(&source)?;
        let target = persistent_log_path(directory, generation + 1);
        fs::rename(&source, &target).map_err(|error| io_error("Cannot rotate persistent log", error))?;
    }
    let current = persistent_log_path(directory, 0);
    if current.exists() {
        inspect_persistent_log_file(&current)?;
        fs::rename(&current, persistent_log_path(directory, 1)).map_err(|error| io_error("Cannot rotate current persistent log", error))?;
    }
    Ok(())
}

fn persistent_log_status_for(app: &AppHandle) -> Result<PersistentLogStatus, String> {
    let directory = persistent_log_directory(app)?;
    let current_bytes = inspect_persistent_log_file(&persistent_log_path(&directory, 0))?;
    Ok(PersistentLogStatus {
        enabled: true,
        format: "jsonl",
        current_file: PERSISTENT_LOG_FILE,
        max_file_bytes: PERSISTENT_LOG_MAX_FILE_BYTES,
        retained_files: PERSISTENT_LOG_RETAINED_FILES,
        current_bytes,
    })
}

fn sync_write(path: &Path, bytes: &[u8], context: &str) -> Result<(), String> {
    fs::write(path, bytes).map_err(|error| io_error(context, error))?;
    let file = fs::File::open(path).map_err(|error| io_error(context, error))?;
    file.sync_all().map_err(|error| io_error(context, error))
}

fn apply_content_fingerprint(bytes: &[u8]) -> u64 {
    // Stable FNV-1a identity fingerprint for crash/race disambiguation. This is not
    // a cryptographic trust primitive; it distinguishes Workbench's own intended
    // bytes from later ordinary filesystem writes without persisting project content.
    let mut hash = 0xcbf29ce484222325u64;
    for byte in bytes {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn recovery_journal_path(app: &AppHandle) -> Result<PathBuf, String> {
    app_data_file(app, TRANSACTION_JOURNAL_FILE)
}

fn recovery_commit_path(app: &AppHandle) -> Result<PathBuf, String> {
    app_data_file(app, TRANSACTION_COMMIT_FILE)
}

fn read_optional_utf8_file(path: &Path, context: &str) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(raw) => Ok(Some(raw)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(io_error(context, error)),
    }
}

fn read_recovery_journal(app: &AppHandle) -> Result<Option<ApplyRecoveryJournal>, String> {
    let path = recovery_journal_path(app)?;
    let Some(raw) = read_optional_utf8_file(
        &path,
        "Cannot read Apply recovery journal; refusing Apply until recovery metadata is readable",
    )? else { return Ok(None); };
    let journal = serde_json::from_str::<ApplyRecoveryJournal>(&raw)
        .map_err(|error| io_error("Cannot parse Apply recovery journal; no project files were modified", error))?;
    Ok(Some(journal))
}

fn write_recovery_journal(app: &AppHandle, journal: &ApplyRecoveryJournal) -> Result<(), String> {
    // A stale commit marker must never be allowed to classify a new transaction as committed.
    // Remove it before publishing the new journal; if removal fails, do not start the transaction.
    let commit_path = recovery_commit_path(app)?;
    if commit_path.exists() {
        fs::remove_file(&commit_path).map_err(|error| io_error("Cannot clear stale Apply commit marker", error))?;
    }
    let path = recovery_journal_path(app)?;
    let raw = serde_json::to_vec_pretty(journal).map_err(|error| io_error("Cannot serialize Apply recovery journal", error))?;
    sync_write(&path, &raw, "Cannot persist Apply recovery journal")
}

fn mark_recovery_committed(app: &AppHandle, txn_id: u64) -> Result<(), String> {
    let path = recovery_commit_path(app)?;
    sync_write(&path, txn_id.to_string().as_bytes(), "Cannot persist Apply commit marker")
}

fn clear_recovery_journal(app: &AppHandle) -> Result<(), String> {
    // Delete the journal first. If journal deletion fails, retain the commit marker so a
    // later recovery still knows that the transaction committed successfully.
    let journal_path = recovery_journal_path(app)?;
    if journal_path.exists() {
        fs::remove_file(&journal_path).map_err(|error| io_error("Cannot clear Apply recovery journal", error))?;
    }
    let commit_path = recovery_commit_path(app)?;
    if commit_path.exists() {
        fs::remove_file(&commit_path).map_err(|error| io_error("Cannot clear Apply commit marker", error))?;
    }
    Ok(())
}

fn recovery_target(root: &Path, raw: &str) -> Result<PathBuf, String> {
    let relative = safe_relative(raw)?;
    let joined = root.join(relative);
    let parent = joined.parent().ok_or_else(|| format!("Invalid recovery target: {raw}"))?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| io_error(&format!("Cannot recover parent for {raw}"), error))?;
    if !canonical_parent.starts_with(root) {
        return Err(format!("Recovery path escaped the selected project root: {raw}"));
    }
    let filename = joined.file_name().ok_or_else(|| format!("Invalid recovery target: {raw}"))?;
    Ok(canonical_parent.join(filename))
}

fn remove_recovery_artifact(path: &Path) -> Result<(), String> {
    if !path.exists() { return Ok(()); }
    let metadata = fs::symlink_metadata(path).map_err(|error| io_error("Cannot inspect Apply recovery artifact", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!("Refusing unsafe Apply recovery artifact: {}", path.display()));
    }
    fs::remove_file(path).map_err(|error| io_error(&format!("Cannot remove recovery artifact {}", path.display()), error))
}

fn journal_matches_root(journal: &ApplyRecoveryJournal, root: &Path) -> bool {
    fs::canonicalize(&journal.project_root).map(|value| value == root).unwrap_or(false)
}

fn parse_recovery_commit_marker(raw: &str, txn_id: u64) -> Result<bool, String> {
    let id = raw.trim().parse::<u64>()
        .map_err(|error| io_error("Cannot parse Apply commit marker; refusing recovery", error))?;
    if id != txn_id {
        return Err(format!(
            "Apply commit marker belongs to transaction {id}, but the recovery journal expects {txn_id}; refusing recovery."
        ));
    }
    Ok(true)
}

fn recovery_commit_state(app: &AppHandle, txn_id: u64) -> Result<bool, String> {
    let commit_path = recovery_commit_path(app)?;
    let Some(raw) = read_optional_utf8_file(
        &commit_path,
        "Cannot read Apply commit marker; refusing recovery",
    )? else { return Ok(false); };
    parse_recovery_commit_marker(&raw, txn_id)
}

fn recover_journal_for_root(app: &AppHandle, root: &Path, journal: &ApplyRecoveryJournal) -> Result<(), String> {
    let committed = recovery_commit_state(app, journal.txn_id)?;

    // Removing staged temp files is always safe: they are transaction-owned and are
    // never the user-visible target. Do this even if a later ambiguity forces us to
    // preserve both the current target and its backup for manual reconciliation.
    for raw in journal.files.iter().rev() {
        let target = recovery_target(root, raw)?;
        let temp = transaction_file(&target, journal.txn_id, "tmp")?;
        remove_recovery_artifact(&temp)?;
    }

    if !committed {
        // Preflight every target before restoring any backup. A crash can occur after
        // Workbench replaced a target but before it wrote the commit marker. If another
        // process then writes newer content, recovery must never overwrite that newer
        // file. Older journals without fingerprints are therefore ambiguous only when
        // both target and backup exist, and fail closed in that state.
        for raw in &journal.files {
            let target = recovery_target(root, raw)?;
            let backup = transaction_file(&target, journal.txn_id, "bak")?;
            if !backup.exists() || !target.exists() { continue; }

            let backup_metadata = fs::symlink_metadata(&backup)
                .map_err(|error| io_error("Cannot inspect Apply backup", error))?;
            if backup_metadata.file_type().is_symlink() || metadata_is_reparse_point(&backup_metadata) || !backup_metadata.is_file() {
                return Err(format!("Refusing unsafe Apply backup: {}", backup.display()));
            }
            let target_metadata = fs::symlink_metadata(&target)
                .map_err(|error| io_error("Cannot inspect recovery target", error))?;
            if target_metadata.file_type().is_symlink() || metadata_is_reparse_point(&target_metadata) || !target_metadata.is_file() {
                return Err(format!("Refusing unsafe Apply recovery target: {}", target.display()));
            }
            let expected = journal.intended_fingerprints.get(raw).ok_or_else(|| format!(
                "Apply recovery for {raw} is ambiguous because this older journal has no intended-content fingerprint. Current file and backup were preserved."
            ))?;
            let current = fs::read(&target)
                .map_err(|error| io_error(&format!("Cannot inspect recovery target {raw}"), error))?;
            if apply_content_fingerprint(&current) != *expected {
                return Err(format!(
                    "Apply recovery refused to overwrite a newer external edit for {raw}. Current file and backup were preserved."
                ));
            }
        }
    }

    for raw in journal.files.iter().rev() {
        let target = recovery_target(root, raw)?;
        let backup = transaction_file(&target, journal.txn_id, "bak")?;
        if committed {
            remove_recovery_artifact(&backup)?;
            continue;
        }
        if !backup.exists() { continue; }
        let metadata = fs::symlink_metadata(&backup).map_err(|error| io_error("Cannot inspect Apply backup", error))?;
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
            return Err(format!("Refusing unsafe Apply backup: {}", backup.display()));
        }
        if target.exists() {
            // Preflight above proved this is still Workbench's intended replacement.
            fs::remove_file(&target).map_err(|error| io_error(&format!("Cannot roll back {}", target.display()), error))?;
        }
        fs::rename(&backup, &target).map_err(|error| io_error(&format!("Cannot restore {}", target.display()), error))?;
    }

    clear_recovery_journal(app)?;
    Ok(())
}

fn recover_project_transaction(app: &AppHandle, root: &Path) -> Result<(), String> {
    let Some(journal) = read_recovery_journal(app)? else { return Ok(()); };
    if journal_matches_root(&journal, root) {
        recover_journal_for_root(app, root, &journal)?;
    }
    Ok(())
}

fn ensure_apply_transaction_slot(app: &AppHandle, root: &Path) -> Result<(), String> {
    let Some(journal) = read_recovery_journal(app)? else { return Ok(()); };
    if journal_matches_root(&journal, root) {
        return recover_journal_for_root(app, root, &journal);
    }
    Err("An unfinished Apply transaction belongs to another project. Reopen that project once so Workbench can recover it before applying new changes.".to_string())
}

fn validate_json_nesting(raw: &str, display: &str) -> Result<(), String> {
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for byte in raw.bytes() {
        if in_string {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                in_string = false;
            }
            continue;
        }
        match byte {
            b'"' => in_string = true,
            b'{' | b'[' => {
                depth += 1;
                if depth > MAX_JSON_NESTING {
                    return Err(format!("Project JSON safety limit exceeded: {display} nests deeper than {MAX_JSON_NESTING} levels."));
                }
            }
            b'}' | b']' => depth = depth.saturating_sub(1),
            _ => {}
        }
    }
    Ok(())
}


fn normalize_semantic_segment(value: &str) -> String {
    value.chars().filter(|character| character.is_ascii_alphanumeric()).flat_map(|character| character.to_lowercase()).collect()
}

fn known_semantic_segment(value: &str) -> bool {
    matches!(normalize_semantic_segment(value).as_str(),
        "assignment" | "assignments" | "blockmask" | "blockmasks" | "density" | "densities" |
        "biome" | "biomes" | "graph" | "graphs" | "graphprovider" | "settings" |
        "worldstructure" | "worldstructures")
}

fn workspace_marker_path(path: &str) -> bool {
    Path::new(path).file_name()
        .map(|value| value.to_string_lossy().eq_ignore_ascii_case("_Workspace.json"))
        .unwrap_or(false)
}

fn normalized_relative(path: &str) -> String {
    path.replace('\\', "/").trim_matches('/').to_string()
}

fn path_under_relative_directory(path: &str, directory: &str) -> bool {
    if directory.is_empty() { return true; }
    let normalized_path = normalized_relative(path).to_ascii_lowercase();
    let normalized_directory = normalized_relative(directory).to_ascii_lowercase();
    normalized_path == normalized_directory || normalized_path.starts_with(&format!("{normalized_directory}/"))
}

fn instance_descriptor_path(path: &str) -> bool {
    let normalized = normalized_relative(path).to_ascii_lowercase();
    normalized.ends_with("/instance.bson") || normalized == "instance.bson"
}

fn default_semantic_candidate(path: &str, root_label: &str, marker_directories: &[String]) -> bool {
    if instance_descriptor_path(path) { return true; }
    if !path.to_ascii_lowercase().ends_with(".json") { return false; }
    if workspace_marker_path(path) { return true; }
    let root = normalize_semantic_segment(root_label);
    if root == "hytalegenerator" || known_semantic_segment(&root) { return true; }
    let segments: Vec<String> = normalized_relative(path).split('/').filter(|segment| !segment.is_empty()).map(normalize_semantic_segment).collect();
    if segments.iter().any(|segment| segment == "hytalegenerator" || known_semantic_segment(segment)) { return true; }
    marker_directories.iter().any(|directory| path_under_relative_directory(path, directory))
}

fn workspace_id_from_value(value: &serde_json::Value) -> Option<String> {
    let object = value.as_object()?;
    if let Some(raw) = object.get("$WorkspaceID").and_then(|item| item.as_str()) {
        if !raw.trim().is_empty() { return Some(raw.trim().to_string()); }
    }
    object.get("$NodeEditorMetadata")
        .and_then(|item| item.as_object())
        .and_then(|metadata| metadata.get("$WorkspaceID"))
        .and_then(|item| item.as_str())
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(str::to_string)
}

fn generator_workspace_label(raw: &str) -> Option<String> {
    let normalized = normalize_semantic_segment(raw);
    if normalized == "worldgenbiome" { return Some("Biome".to_string()); }
    if normalized == "worldgengraphprovider" { return Some("GraphProvider".to_string()); }
    let remainder = normalized.strip_prefix("hytalegenerator")?;
    if remainder.is_empty() { return Some("HytaleGenerator".to_string()); }
    let label = match remainder {
        "assignment" | "assignments" => "Assignments",
        "biome" | "biomes" => "Biome",
        "blockmask" | "blockmasks" => "BlockMask",
        "density" | "densities" => "Density",
        "graph" | "graphs" | "graphprovider" => "GraphProvider",
        "settings" => "Settings",
        "worldstructure" | "worldstructures" => "WorldStructure",
        _ => return Some(raw.trim().trim_start_matches("HytaleGenerator").trim_matches(|c: char| c == '-' || c == ':' || c.is_whitespace()).to_string()),
    };
    Some(label.to_string())
}

fn value_has_keys(value: &serde_json::Value, keys: &[&str]) -> bool {
    value.as_object().map(|object| keys.iter().all(|key| object.contains_key(*key))).unwrap_or(false)
}

fn detect_semantic_file(path: &str, text: &str, allow_default_fallback: bool, discovery_source: &str) -> Result<Option<SemanticFileInfo>, String> {
    let value = match serde_json::from_str::<serde_json::Value>(text) {
        Ok(value) => value,
        Err(_error) => {
            // Known JSON candidates remain semantic so the existing parser can surface their parse error.
            if allow_default_fallback && path.to_ascii_lowercase().ends_with(".json") {
                return Ok(Some(SemanticFileInfo {
                    path: path.to_string(),
                    format: "structured-json".to_string(),
                    domain: "hytale-generator".to_string(),
                    role: "known-json".to_string(),
                    workspace: None,
                    workspace_id: None,
                    discovery_source: discovery_source.to_string(),
                    detector: "default-path-v1".to_string(),
                }));
            }
            return Ok(None);
        }
    };

    if workspace_marker_path(path) {
        return Ok(Some(SemanticFileInfo {
            path: path.to_string(), format: "structured-json".to_string(), domain: "hytale-generator".to_string(),
            role: "workspace-config".to_string(), workspace: None, workspace_id: None, discovery_source: discovery_source.to_string(),
            detector: "workspace-marker-v1".to_string(),
        }));
    }

    if let Some(workspace_id) = workspace_id_from_value(&value) {
        if let Some(workspace) = generator_workspace_label(&workspace_id) {
            return Ok(Some(SemanticFileInfo {
                path: path.to_string(), format: "node-editor".to_string(), domain: "hytale-generator".to_string(),
                role: "graph-document".to_string(), workspace: Some(workspace), workspace_id: Some(workspace_id),
                discovery_source: discovery_source.to_string(),
                detector: "node-editor-workspace-v1".to_string(),
            }));
        }
        // A valid NodeEditor document in another domain (for example Scriptable Brush)
        // is intentionally not loaded into the Hytale Generator semantic model.
        return Ok(None);
    }

    if value_has_keys(&value, &["DefaultBiome", "Density", "Framework"]) {
        return Ok(Some(SemanticFileInfo {
            path: path.to_string(), format: "structured-json".to_string(), domain: "hytale-generator".to_string(),
            role: "flow-orchestrator".to_string(), workspace: Some("WorldStructure".to_string()), workspace_id: None,
            discovery_source: discovery_source.to_string(),
            detector: "world-structure-v1".to_string(),
        }));
    }

    if let Some(worldgen) = value.as_object().and_then(|object| object.get("WorldGen")).and_then(|item| item.as_object()) {
        let generator_type = worldgen.get("Type").and_then(|item| item.as_str()).unwrap_or_default();
        let world_structure = worldgen.get("WorldStructure").and_then(|item| item.as_str()).unwrap_or_default();
        if generator_type.eq_ignore_ascii_case("HytaleGenerator") && !world_structure.trim().is_empty() {
            return Ok(Some(SemanticFileInfo {
                path: path.to_string(), format: if path.to_ascii_lowercase().ends_with(".json") { "structured-json" } else { "structured-text" }.to_string(),
                domain: "hytale-generator".to_string(), role: "flow-entrypoint".to_string(), workspace: Some("Instance".to_string()),
                workspace_id: None, discovery_source: discovery_source.to_string(),
                detector: "hytale-generator-instance-v1".to_string(),
            }));
        }
    }

    let normalized_path = normalized_relative(path).to_ascii_lowercase();
    if normalized_path.contains("/settings/") || normalized_path.starts_with("settings/") || normalize_semantic_segment(path_label(Path::new(path)).as_str()) == "settingsjson" {
        if allow_default_fallback {
            return Ok(Some(SemanticFileInfo {
                path: path.to_string(), format: "structured-json".to_string(), domain: "hytale-generator".to_string(),
                role: "runtime-config".to_string(), workspace: Some("Settings".to_string()), workspace_id: None,
                discovery_source: discovery_source.to_string(),
                detector: "settings-path-v1".to_string(),
            }));
        }
    }

    if allow_default_fallback && path.to_ascii_lowercase().ends_with(".json") {
        return Ok(Some(SemanticFileInfo {
            path: path.to_string(), format: "structured-json".to_string(), domain: "hytale-generator".to_string(),
            role: "known-json".to_string(), workspace: None, workspace_id: None, discovery_source: discovery_source.to_string(),
            detector: "default-path-v1".to_string(),
        }));
    }
    Ok(None)
}

fn read_probe_text(path: &Path, relative: &str, size: u64, total_probe_bytes: &mut u64) -> Result<Option<String>, String> {
    if size > MAX_DISCOVERY_PROBE_FILE_BYTES { return Ok(None); }
    *total_probe_bytes = total_probe_bytes.saturating_add(size);
    if *total_probe_bytes > MAX_DISCOVERY_PROBE_TOTAL_BYTES {
        return Err(format!("Semantic discovery safety limit exceeded: probed text is larger than {} MiB.", MAX_DISCOVERY_PROBE_TOTAL_BYTES / (1024 * 1024)));
    }
    let bytes = fs::read(path).map_err(|error| io_error(&format!("Cannot probe {relative}"), error))?;
    let Ok(text) = String::from_utf8(bytes) else { return Ok(None); };
    let first = text.trim_start().chars().next();
    if !matches!(first, Some('{') | Some('[')) { return Ok(None); }
    Ok(Some(text))
}

fn trace_duration_ms(duration: Duration) -> f64 {
    (duration.as_secs_f64() * 100_000.0).round() / 100.0
}

fn trace_data(items: &[(&str, u64)]) -> HashMap<String, u64> {
    items.iter().map(|(key, value)| ((*key).to_string(), *value)).collect()
}

fn trace_phase(name: &str, duration: Duration, data: &[(&str, u64)]) -> NativeTracePhase {
    NativeTracePhase {
        name: name.to_string(),
        duration_ms: trace_duration_ms(duration),
        data: trace_data(data),
    }
}

#[cfg(windows)]
fn metadata_is_reparse_point(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
    metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

#[cfg(not(windows))]
fn metadata_is_reparse_point(_metadata: &fs::Metadata) -> bool {
    false
}

fn scan_tree(root: &Path, discovery_roots: &[String]) -> Result<ProjectScan, String> {
    scan_tree_traced(root, discovery_roots, None)
}

fn scan_tree_traced(root: &Path, discovery_roots: &[String], trace_id: Option<String>) -> Result<ProjectScan, String> {
    let scan_started = Instant::now();
    let canonicalize_started = Instant::now();
    let canonical_root = fs::canonicalize(root)
        .map_err(|error| io_error(&format!("Cannot open {}", root.display()), error))?;
    let canonicalize_duration = canonicalize_started.elapsed();
    let mut trace_phases = vec![trace_phase("desktop.project.root.canonicalize", canonicalize_duration, &[])];
    if !canonical_root.is_dir() {
        return Err("Selected project path is not a directory.".to_string());
    }

    // Phase 1: inventory only. Contents are not read here.
    let inventory_walk_started = Instant::now();
    let mut inventory: Vec<(String, PathBuf, u64)> = Vec::new();
    let mut stack = vec![canonical_root.clone()];
    let mut seen_directories = HashSet::new();
    let mut visited_entries = 0usize;
    let mut visited_directories = 0usize;
    let mut directory_canonicalize_duration = Duration::ZERO;
    let mut directory_enumerate_duration = Duration::ZERO;
    let mut metadata_duration = Duration::ZERO;
    let mut file_canonicalize_duration = Duration::ZERO;
    let mut relative_path_duration = Duration::ZERO;
    let mut reparse_point_entries = 0usize;
    let mut file_canonicalization_checks = 0usize;
    let mut file_canonical_path_changes = 0usize;
    let mut file_containment_rejects = 0usize;
    let mut file_fast_path_candidates = 0usize;
    let mut file_fast_path_used = 0usize;

    // Every directory placed on the stack is already canonicalized and checked
    // against the project root before descent. Re-canonicalizing it when popped
    // duplicated the same Windows filesystem operation for every directory.
    while let Some(canonical_directory) = stack.pop() {
        if !canonical_directory.starts_with(&canonical_root) || !seen_directories.insert(canonical_directory.clone()) {
            continue;
        }
        visited_directories += 1;
        let directory_enumerate_started = Instant::now();
        let directory_entries = sorted_directory_entries(&canonical_directory)?;
        directory_enumerate_duration += directory_enumerate_started.elapsed();
        for entry in directory_entries {
            visited_entries += 1;
            if visited_entries > MAX_PROJECT_ENTRIES {
                return Err(format!("Project safety limit exceeded: more than {MAX_PROJECT_ENTRIES} files/directories."));
            }
            let path = entry.path();
            if is_transaction_artifact(&path) { continue; }
            let metadata_started = Instant::now();
            // DirEntry metadata preserves the non-following symlink semantics we
            // need here while allowing Windows to reuse metadata returned by the
            // directory enumeration instead of issuing a fresh path lookup.
            let metadata = entry.metadata()
                .map_err(|error| io_error("Cannot inspect project entry", error))?;
            metadata_duration += metadata_started.elapsed();
            let is_reparse_point = metadata_is_reparse_point(&metadata);
            if is_reparse_point { reparse_point_entries += 1; }
            if metadata.file_type().is_symlink() { continue; }
            if metadata.is_dir() {
                let child_canonicalize_started = Instant::now();
                let canonical = fs::canonicalize(&path);
                directory_canonicalize_duration += child_canonicalize_started.elapsed();
                let Ok(canonical) = canonical else { continue; };
                if canonical.starts_with(&canonical_root) { stack.push(canonical); }
                continue;
            }
            if !metadata.is_file() { continue; }
            // v0.11.5 selective regular-file fast path. Every entry here comes
            // from a directory that was canonicalized and root-contained before
            // descent. A normal non-reparse file therefore cannot redirect path
            // resolution outside that validated directory, so avoid the expensive
            // per-file canonicalize call. Reparse-backed files keep the proven
            // canonicalize + containment fallback.
            let inventory_path = if !is_reparse_point {
                file_fast_path_candidates += 1;
                file_fast_path_used += 1;
                path
            } else {
                file_canonicalization_checks += 1;
                let file_canonicalize_started = Instant::now();
                let canonical_file = fs::canonicalize(&path)
                    .map_err(|error| io_error("Cannot canonicalize project file", error))?;
                file_canonicalize_duration += file_canonicalize_started.elapsed();
                if canonical_file != path { file_canonical_path_changes += 1; }
                if !canonical_file.starts_with(&canonical_root) {
                    file_containment_rejects += 1;
                    continue;
                }
                canonical_file
            };
            let relative_path_started = Instant::now();
            let relative = relative_display(&canonical_root, &inventory_path)?;
            relative_path_duration += relative_path_started.elapsed();
            inventory.push((relative, inventory_path, metadata.len()));
        }
    }

    let inventory_walk_duration = inventory_walk_started.elapsed();
    let measured_inventory_duration = directory_canonicalize_duration
        .saturating_add(directory_enumerate_duration)
        .saturating_add(metadata_duration)
        .saturating_add(file_canonicalize_duration)
        .saturating_add(relative_path_duration);
    let inventory_other_duration = inventory_walk_duration.saturating_sub(measured_inventory_duration);
    trace_phases.push(trace_phase(
        "desktop.project.inventory.directory-canonicalize",
        directory_canonicalize_duration,
        &[("directories", visited_directories as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.inventory.enumerate",
        directory_enumerate_duration,
        &[("directories", visited_directories as u64), ("visitedEntries", visited_entries as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.inventory.metadata",
        metadata_duration,
        &[("visitedEntries", visited_entries as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.inventory.file-canonicalize",
        file_canonicalize_duration,
        &[
            ("inventoryFiles", inventory.len() as u64),
            ("canonicalizationChecks", file_canonicalization_checks as u64),
            ("fastPathCandidates", file_fast_path_candidates as u64),
            ("fastPathUsed", file_fast_path_used as u64),
            ("canonicalPathChanges", file_canonical_path_changes as u64),
            ("containmentRejects", file_containment_rejects as u64),
            ("reparsePointEntries", reparse_point_entries as u64),
        ],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.inventory.relative-path",
        relative_path_duration,
        &[("inventoryFiles", inventory.len() as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.inventory.other",
        inventory_other_duration,
        &[("visitedEntries", visited_entries as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.inventory.walk",
        inventory_walk_duration,
        &[("visitedEntries", visited_entries as u64), ("inventoryFiles", inventory.len() as u64)],
    ));
    let inventory_finalize_started = Instant::now();
    inventory.sort_by(|left, right| left.0.cmp(&right.0));
    let entries: Vec<String> = inventory.iter().map(|item| item.0.clone()).collect();
    let marker_directories: Vec<String> = entries.iter()
        .filter(|path| workspace_marker_path(path))
        .map(|path| Path::new(path).parent().map(|value| value.to_string_lossy().replace('\\', "/")).unwrap_or_default())
        .collect();
    let root_label = path_label(&canonical_root);
    trace_phases.push(trace_phase(
        "desktop.project.inventory.finalize",
        inventory_finalize_started.elapsed(),
        &[("inventoryFiles", inventory.len() as u64), ("workspaceMarkers", marker_directories.len() as u64)],
    ));

    // Phase 2: detector-based semantic discovery. Default candidate zones preserve current
    // workflows; user discovery roots only opt files in when a known detector actually matches.
    let mut files = Vec::new();
    let mut semantic_files = Vec::new();
    let mut total_semantic_bytes = 0u64;
    let mut total_probe_bytes = 0u64;
    let mut probe_count = 0usize;
    let semantic_started = Instant::now();
    let mut semantic_read_duration = Duration::ZERO;
    let mut semantic_detect_duration = Duration::ZERO;
    let mut semantic_candidate_count = 0usize;

    for (relative, canonical_file, size) in &inventory {
        let default_candidate = default_semantic_candidate(relative, &root_label, &marker_directories);
        let manual_candidate = discovery_roots.iter().any(|directory| path_under_relative_directory(relative, directory));
        if !default_candidate && !manual_candidate { continue; }
        semantic_candidate_count += 1;

        if manual_candidate && !default_candidate {
            probe_count += 1;
            if probe_count > MAX_DISCOVERY_PROBE_FILES {
                return Err(format!("Semantic discovery safety limit exceeded: more than {MAX_DISCOVERY_PROBE_FILES} files under user-probed folders."));
            }
        }

        let semantic_read_started = Instant::now();
        let text = if default_candidate && relative.to_ascii_lowercase().ends_with(".json") {
            if *size > MAX_JSON_FILE_BYTES {
                return Err(format!(
                    "Project JSON safety limit exceeded: {relative} is {} MiB; automatic semantic parsing is limited to {} MiB per JSON file.",
                    size / (1024 * 1024), MAX_JSON_FILE_BYTES / (1024 * 1024),
                ));
            }
            total_semantic_bytes = total_semantic_bytes.saturating_add(*size);
            if total_semantic_bytes > MAX_TOTAL_JSON_BYTES {
                return Err(format!("Project JSON safety limit exceeded: semantic input is larger than {} MiB.", MAX_TOTAL_JSON_BYTES / (1024 * 1024)));
            }
            Some(fs::read_to_string(canonical_file).map_err(|error| io_error(&format!("Cannot read semantic JSON file {relative}"), error))?)
        } else {
            read_probe_text(canonical_file, relative, *size, &mut total_probe_bytes)?
        };
        semantic_read_duration += semantic_read_started.elapsed();
        let Some(text) = text else { continue; };
        if relative.to_ascii_lowercase().ends_with(".json") { validate_json_nesting(&text, relative)?; }

        let source = if manual_candidate && !default_candidate { "manual-probe" } else if instance_descriptor_path(relative) { "detector" } else { "default" };
        let semantic_detect_started = Instant::now();
        let detected = detect_semantic_file(relative, &text, default_candidate && relative.to_ascii_lowercase().ends_with(".json"), source)?;
        semantic_detect_duration += semantic_detect_started.elapsed();
        let Some(info) = detected else { continue; };
        if files.len() >= MAX_JSON_FILES {
            return Err(format!("Project safety limit exceeded: more than {MAX_JSON_FILES} semantic files."));
        }
        files.push(TextFile { path: relative.clone(), text });
        semantic_files.push(info);
    }

    let semantic_total_duration = semantic_started.elapsed();
    let semantic_classify_duration = semantic_total_duration
        .saturating_sub(semantic_read_duration)
        .saturating_sub(semantic_detect_duration);
    trace_phases.push(trace_phase(
        "desktop.project.semantic.classify",
        semantic_classify_duration,
        &[("candidateFiles", semantic_candidate_count as u64), ("inventoryFiles", inventory.len() as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.semantic.read",
        semantic_read_duration,
        &[("candidateFiles", semantic_candidate_count as u64), ("semanticBytes", total_semantic_bytes), ("probeBytes", total_probe_bytes)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.semantic.detect",
        semantic_detect_duration,
        &[("semanticFiles", semantic_files.len() as u64)],
    ));
    trace_phases.push(trace_phase(
        "desktop.project.scan.total",
        scan_started.elapsed(),
        &[("inventoryFiles", inventory.len() as u64), ("semanticFiles", semantic_files.len() as u64)],
    ));

    Ok(ProjectScan {
        root: canonical_root.to_string_lossy().to_string(),
        label: root_label,
        files,
        entries,
        semantic_files,
        discovery_roots: discovery_roots.to_vec(),
        native_trace: Some(NativeProjectTrace { trace_id, phases: trace_phases }),
    })
}

fn event_kind_label(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::Create(_) => "create",
        EventKind::Modify(ModifyKind::Name(_)) => "rename",
        EventKind::Modify(_) => "modify",
        EventKind::Remove(_) => "remove",
        EventKind::Access(_) => "access",
        _ => "other",
    }
}

fn build_project_watcher(app: &AppHandle, state: &State<'_, DesktopState>, root: &Path) -> Result<RecommendedWatcher, String> {
    let watch_root = root.to_path_buf();
    let watch_root_for_callback = watch_root.clone();
    let root_label = watch_root.to_string_lossy().to_string();
    let suppression = state.watch_suppression.clone();
    let active_writes = state.active_write_paths.clone();
    let app_handle = app.clone();

    let mut watcher = RecommendedWatcher::new(
        move |result: notify::Result<Event>| {
            let Ok(event) = result else { return; };
            if matches!(event.kind, EventKind::Access(_)) { return; }
            let now = Instant::now();
            let mut paths = Vec::new();
            for path in event.paths {
                if is_transaction_artifact(&path) { continue; }
                let active = active_writes.lock().ok().map(|entries| entries.contains(&path)).unwrap_or(false);
                if active { continue; }
                let suppressed = suppression
                    .lock()
                    .ok()
                    .map(|mut entries| {
                        entries.retain(|_, entry| entry.until > now);
                        let matches_expected = entries
                            .get(&path)
                            .and_then(|entry| fs::read_to_string(&path).ok().map(|current| current == entry.expected))
                            .unwrap_or(false);
                        if entries.contains_key(&path) && !matches_expected {
                            entries.remove(&path);
                        }
                        matches_expected
                    })
                    .unwrap_or(false);
                if suppressed { continue; }
                let Ok(relative) = relative_display(&watch_root_for_callback, &path) else { continue; };
                if relative.is_empty() { continue; }
                paths.push(relative);
            }
            paths.sort();
            paths.dedup();
            if paths.is_empty() { return; }
            let payload = ProjectFilesChanged {
                root: root_label.clone(),
                paths,
                kind: event_kind_label(&event.kind).to_string(),
            };
            let _ = app_handle.emit("project-files-changed", payload);
        },
        Config::default(),
    ).map_err(|error| io_error("Cannot create project file watcher", error))?;

    watcher
        .watch(&watch_root, RecursiveMode::Recursive)
        .map_err(|error| io_error(&format!("Cannot watch {}", watch_root.display()), error))?;
    Ok(watcher)
}

fn clear_active_project(state: &State<'_, DesktopState>) -> Result<(), String> {
    *state.project.lock().map_err(|_| "Project state lock is poisoned.".to_string())? = None;
    state.output_roots.lock().map_err(|_| "Output state lock is poisoned.".to_string())?.clear();
    state.save_targets.lock().map_err(|_| "Save-target state lock is poisoned.".to_string())?.clear();
    state.worldgen_logs.lock().map_err(|_| "WorldGen-log state lock is poisoned.".to_string())?.clear();
    *state.watcher.lock().map_err(|_| "Watcher state lock is poisoned.".to_string())? = None;
    state.watch_suppression.lock().map_err(|_| "Watcher suppression lock is poisoned.".to_string())?.clear();
    state.active_write_paths.lock().map_err(|_| "Active-write state lock is poisoned.".to_string())?.clear();
    state.pending_change_count.store(0, Ordering::Relaxed);
    Ok(())
}

fn revalidate_authorized_directory(path: &Path, expected_canonical: &Path, label: &str) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| io_error(&format!("Cannot revalidate {label}"), error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_dir() {
        return Err(format!("{label} changed after native authorization; select/open it again."));
    }
    let canonical = fs::canonicalize(path)
        .map_err(|error| io_error(&format!("Cannot canonicalize {label}"), error))?;
    if canonical != expected_canonical {
        return Err(format!("{label} changed after native authorization; select/open it again."));
    }
    Ok(())
}

fn active_project(state: &State<'_, DesktopState>) -> Result<ProjectState, String> {
    let project = state.project.lock().map_err(|_| "Project state lock is poisoned.".to_string())?.clone()
        .ok_or_else(|| "No project is currently open.".to_string())?;
    revalidate_authorized_directory(&project.root, &project.canonical_root, "Active project root")?;
    Ok(project)
}

fn set_active_project(app: &AppHandle, state: &State<'_, DesktopState>, root: PathBuf, trace_id: Option<String>) -> Result<ProjectScan, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    let native_open_started = Instant::now();
    let canonical_started = Instant::now();
    let canonical_root = fs::canonicalize(&root)
        .map_err(|error| io_error(&format!("Cannot open {}", root.display()), error))?;
    let canonical_duration = canonical_started.elapsed();

    let recovery_started = Instant::now();
    recover_project_transaction(app, &canonical_root)?;
    let recovery_duration = recovery_started.elapsed();

    let discovery_started = Instant::now();
    let discovery_roots = discovery_roots_for_project(app, &canonical_root)?;
    let discovery_duration = discovery_started.elapsed();

    let mut scan = scan_tree_traced(&canonical_root, &discovery_roots, trace_id.clone())?;

    let watcher_started = Instant::now();
    let watcher = build_project_watcher(app, state, &canonical_root)?;
    let watcher_duration = watcher_started.elapsed();
    let discovery_root_count = discovery_roots.len();
    let project = ProjectState { root: canonical_root.clone(), canonical_root: canonical_root.clone(), discovery_roots };

    // Commit the runtime switch only after both scan and watcher setup succeeded.
    // This prevents the native filesystem authority from diverging from the still-visible UI project.
    let mut project_slot = state.project.lock().map_err(|_| "Project state lock is poisoned.".to_string())?;
    let mut output_roots = state.output_roots.lock().map_err(|_| "Output state lock is poisoned.".to_string())?;
    let mut save_targets = state.save_targets.lock().map_err(|_| "Save-target state lock is poisoned.".to_string())?;
    let mut worldgen_logs = state.worldgen_logs.lock().map_err(|_| "WorldGen-log state lock is poisoned.".to_string())?;
    let mut watcher_slot = state.watcher.lock().map_err(|_| "Watcher state lock is poisoned.".to_string())?;
    let mut suppression = state.watch_suppression.lock().map_err(|_| "Watcher suppression lock is poisoned.".to_string())?;
    let mut active_writes = state.active_write_paths.lock().map_err(|_| "Active-write state lock is poisoned.".to_string())?;

    *project_slot = Some(project);
    output_roots.clear();
    save_targets.clear();
    worldgen_logs.clear();
    *watcher_slot = Some(watcher);
    suppression.clear();
    active_writes.clear();
    state.pending_change_count.store(0, Ordering::Relaxed);

    if let Some(native_trace) = scan.native_trace.as_mut() {
        native_trace.phases.push(trace_phase("desktop.project.authority.canonicalize", canonical_duration, &[]));
        native_trace.phases.push(trace_phase("desktop.project.recovery", recovery_duration, &[]));
        native_trace.phases.push(trace_phase("desktop.project.discovery-profile", discovery_duration, &[("discoveryRoots", discovery_root_count as u64)]));
        native_trace.phases.push(trace_phase("desktop.project.watcher.setup", watcher_duration, &[]));
        native_trace.phases.push(trace_phase(
            "desktop.project.native-open.total",
            native_open_started.elapsed(),
            &[("inventoryFiles", scan.entries.len() as u64), ("semanticFiles", scan.semantic_files.len() as u64)],
        ));
    }
    Ok(scan)
}

fn discovery_profiles_path(app: &AppHandle) -> Result<PathBuf, String> {
    app_data_file(app, DISCOVERY_PROFILES_FILE)
}

fn load_discovery_profiles(app: &AppHandle) -> Result<DiscoveryProfiles, String> {
    let path = discovery_profiles_path(app)?;
    let Ok(raw) = fs::read_to_string(path) else { return Ok(DiscoveryProfiles::default()); };
    serde_json::from_str::<DiscoveryProfiles>(&raw).map_err(|error| io_error("Cannot parse semantic discovery profiles", error))
}

fn discovery_roots_for_project(app: &AppHandle, root: &Path) -> Result<Vec<String>, String> {
    let profiles = load_discovery_profiles(app)?;
    let key = root.to_string_lossy().to_string();
    let mut roots = profiles.projects.get(&key).cloned().unwrap_or_default();
    roots.retain(|raw| safe_relative(raw).is_ok());
    roots.sort();
    roots.dedup();
    Ok(roots)
}

fn persist_discovery_roots(app: &AppHandle, root: &Path, roots: &[String]) -> Result<(), String> {
    let mut profiles = load_discovery_profiles(app)?;
    let key = root.to_string_lossy().to_string();
    let mut normalized = roots.iter().filter_map(|raw| safe_relative(raw).ok().map(|path| path.to_string_lossy().replace('\\', "/"))).collect::<Vec<_>>();
    normalized.sort();
    normalized.dedup();
    if normalized.is_empty() { profiles.projects.remove(&key); } else { profiles.projects.insert(key, normalized); }
    let path = discovery_profiles_path(app)?;
    let raw = serde_json::to_vec_pretty(&profiles).map_err(|error| io_error("Cannot serialize semantic discovery profiles", error))?;
    fs::write(path, raw).map_err(|error| io_error("Cannot persist semantic discovery profiles", error))
}

fn commit_discovery_roots(
    app: &AppHandle,
    state: &State<'_, DesktopState>,
    project: &ProjectState,
    mut discovery_roots: Vec<String>,
) -> Result<ProjectScan, String> {
    revalidate_authorized_directory(&project.root, &project.canonical_root, "Active project root")?;
    discovery_roots.retain(|raw| safe_relative(raw).is_ok());
    discovery_roots.sort();
    discovery_roots.dedup();

    // Scan before persistence/state mutation: a bad profile must never partially replace
    // the currently active semantic model.
    let scan = scan_tree(&project.root, &discovery_roots)?;
    {
        let mut project_slot = state.project.lock().map_err(|_| "Project state lock is poisoned.".to_string())?;
        let Some(active) = project_slot.as_mut() else { return Err("No project is currently open.".to_string()); };
        if active.canonical_root != project.canonical_root {
            return Err("The active project changed while the semantic discovery profile was updating.".to_string());
        }
        persist_discovery_roots(app, &project.root, &discovery_roots)?;
        active.discovery_roots = discovery_roots;
    }
    Ok(scan)
}

fn recent_grants_path(app: &AppHandle) -> Result<PathBuf, String> {
    app_data_file(app, RECENT_GRANTS_FILE)
}

fn load_recent_grants(app: &AppHandle) -> Result<HashSet<PathBuf>, String> {
    let path = recent_grants_path(app)?;
    let Ok(raw) = fs::read_to_string(path) else { return Ok(HashSet::new()); };
    let values: Vec<String> = serde_json::from_str(&raw).map_err(|error| io_error("Cannot parse recent-project grants", error))?;
    let mut grants = HashSet::new();
    for raw in values {
        if let Ok(canonical) = fs::canonicalize(raw) {
            if canonical.is_dir() { grants.insert(canonical); }
        }
    }
    Ok(grants)
}

fn persist_recent_grants(app: &AppHandle, state: &State<'_, DesktopState>) -> Result<(), String> {
    let path = recent_grants_path(app)?;
    let mut values = state.recent_grants.lock().map_err(|_| "Recent-grant state lock is poisoned.".to_string())?
        .iter().map(|path| path.to_string_lossy().to_string()).collect::<Vec<_>>();
    values.sort();
    let raw = serde_json::to_vec_pretty(&values).map_err(|error| io_error("Cannot serialize recent-project grants", error))?;
    fs::write(path, raw).map_err(|error| io_error("Cannot persist recent-project grants", error))
}

fn remember_recent_grant(app: &AppHandle, state: &State<'_, DesktopState>, root: &Path) -> Result<(), String> {
    let canonical = fs::canonicalize(root).map_err(|error| io_error("Cannot authorize selected project", error))?;
    state.recent_grants.lock().map_err(|_| "Recent-grant state lock is poisoned.".to_string())?.insert(canonical);
    persist_recent_grants(app, state)
}

fn resolve_existing_project_file(project: &ProjectState, raw: &str) -> Result<PathBuf, String> {
    let relative = safe_relative(raw)?;
    let joined = project.root.join(relative);
    let canonical = fs::canonicalize(&joined).map_err(|error| io_error(&format!("Cannot access {raw}"), error))?;
    if !canonical.starts_with(&project.canonical_root) || !canonical.is_file() {
        return Err(format!("Project path escaped the selected root: {raw}"));
    }
    Ok(canonical)
}

fn inspect_output_path(root: &Path, raw: &str) -> Result<PathBuf, String> {
    let relative = safe_relative(raw)?;
    let mut current = root.to_path_buf();
    if let Some(parent) = relative.parent() {
        for component in parent.components() {
            let Component::Normal(name) = component else { return Err(format!("Unsafe output path rejected: {raw}")); };
            current.push(name);
            if !current.exists() {
                return Ok(root.join(relative));
            }
            let metadata = fs::symlink_metadata(&current).map_err(|error| io_error("Cannot inspect output directory", error))?;
            if metadata.file_type().is_symlink() || !metadata.is_dir() {
                return Err(format!("Unsafe output path component: {}", current.display()));
            }
            let canonical = fs::canonicalize(&current).map_err(|error| io_error("Cannot canonicalize output directory", error))?;
            if !canonical.starts_with(root) {
                return Err(format!("Output path escaped the selected output root: {raw}"));
            }
        }
    }
    let target = root.join(relative);
    if target.exists() {
        let metadata = fs::symlink_metadata(&target).map_err(|error| io_error("Cannot inspect output file", error))?;
        if metadata.file_type().is_symlink() || metadata.is_dir() {
            return Err(format!("Unsafe output target: {}", target.display()));
        }
        let canonical = fs::canonicalize(&target).map_err(|error| io_error("Cannot canonicalize output target", error))?;
        if !canonical.starts_with(root) {
            return Err(format!("Output path escaped the selected output root: {raw}"));
        }
    }
    Ok(target)
}

fn ensure_output_path(root: &Path, raw: &str) -> Result<PathBuf, String> {
    let relative = safe_relative(raw)?;
    let mut current = root.to_path_buf();
    if let Some(parent) = relative.parent() {
        for component in parent.components() {
            let Component::Normal(name) = component else { return Err(format!("Unsafe output path rejected: {raw}")); };
            current.push(name);
            if current.exists() {
                let metadata = fs::symlink_metadata(&current).map_err(|error| io_error("Cannot inspect output directory", error))?;
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    return Err(format!("Unsafe output path component: {}", current.display()));
                }
                let canonical = fs::canonicalize(&current).map_err(|error| io_error("Cannot canonicalize output directory", error))?;
                if !canonical.starts_with(root) {
                    return Err(format!("Output path escaped the selected output root: {raw}"));
                }
            } else {
                fs::create_dir(&current).map_err(|error| io_error(&format!("Cannot create {}", current.display()), error))?;
            }
        }
    }
    let target = root.join(relative);
    if target.exists() {
        let metadata = fs::symlink_metadata(&target).map_err(|error| io_error("Cannot inspect output file", error))?;
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || metadata.is_dir() {
            return Err(format!("Unsafe output target: {}", target.display()));
        }
        let canonical = fs::canonicalize(&target).map_err(|error| io_error("Cannot canonicalize output target", error))?;
        if !canonical.starts_with(root) {
            return Err(format!("Output path escaped the selected output root: {raw}"));
        }
    }
    Ok(target)
}

fn output_root(state: &State<'_, DesktopState>, token: &str) -> Result<PathBuf, String> {
    let root = state.output_roots.lock().map_err(|_| "Output state lock is poisoned.".to_string())?.get(token).cloned()
        .ok_or_else(|| "The selected output folder is no longer registered.".to_string())?;
    revalidate_authorized_directory(&root, &root, "Selected output folder")?;
    Ok(root)
}

#[tauri::command]
async fn select_project(payload: TracePayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<ProjectScan>, String> {
    let selected = app.dialog().file().set_title("Open Hytale project").blocking_pick_folder();
    let Some(selected) = selected else { return Ok(None); };
    let root = selected.into_path().map_err(|_| "The selected project is not a local filesystem path.".to_string())?;
    let scan = set_active_project(&app, &state, root, payload.trace_id)?;
    // A grant-persistence failure must not leave Rust on the new project while the UI thinks opening failed.
    // The current picker selection is already explicit authority for this session; failed persistence only
    // means the Recent entry will require native re-authorization next time.
    let _ = remember_recent_grant(&app, &state, Path::new(&scan.root));
    Ok(Some(scan))
}

#[tauri::command]
async fn open_recent_project(payload: RootPayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectScan, String> {
    let canonical = fs::canonicalize(&payload.root)
        .map_err(|_| "REAUTHORIZE_RECENT: This recent project must be selected once again before it can be reopened securely.".to_string())?;
    let allowed = state.recent_grants.lock().map_err(|_| "Recent-grant state lock is poisoned.".to_string())?.contains(&canonical);
    if !allowed {
        return Err("REAUTHORIZE_RECENT: This recent project must be selected once again before it can be reopened securely.".to_string());
    }
    set_active_project(&app, &state, canonical, payload.trace_id)
}

#[tauri::command]
fn revoke_recent_project(payload: RootPayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<(), String> {
    let raw = PathBuf::from(payload.root);
    let canonical = fs::canonicalize(&raw).unwrap_or(raw);
    state.recent_grants.lock().map_err(|_| "Recent-grant state lock is poisoned.".to_string())?.remove(&canonical);
    persist_recent_grants(&app, &state)
}

#[tauri::command]
async fn reload_project(app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectScan, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    let project = active_project(&state)?;
    recover_project_transaction(&app, &project.root)?;
    scan_tree(&project.root, &project.discovery_roots)
}

#[tauri::command]
async fn probe_project_path(payload: ProjectProbePayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectProbeResult, String> {
    let project = active_project(&state)?;
    let relative = safe_relative(&payload.path)?;
    let candidate = project.root.join(&relative);
    let canonical = fs::canonicalize(&candidate).map_err(|error| io_error(&format!("Cannot probe {}", payload.path), error))?;
    if !canonical.starts_with(&project.canonical_root) || !canonical.is_dir() {
        return Err(format!("Probe path must be an existing folder inside the active project: {}", payload.path));
    }
    let relative_display_path = relative_display(&project.canonical_root, &canonical)?;
    if relative_display_path.is_empty() {
        return Err("Probe the project root by opening the project; folder re-scan is intended for an inventory-only subfolder.".to_string());
    }

    let mut discovery_roots = project.discovery_roots.clone();
    if !discovery_roots.iter().any(|item| item.eq_ignore_ascii_case(&relative_display_path)) {
        discovery_roots.push(relative_display_path.clone());
    }
    let scan = commit_discovery_roots(&app, &state, &project, discovery_roots)?;
    let detected = scan.semantic_files.iter()
        .filter(|info| path_under_relative_directory(&info.path, &relative_display_path))
        .cloned()
        .collect::<Vec<_>>();
    Ok(ProjectProbeResult { scan, probed_root: relative_display_path, detected })
}

#[tauri::command]
async fn select_project_probe_path(app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<ProjectProbeResult>, String> {
    let project = active_project(&state)?;
    let selected = app.dialog().file()
        .set_title("Add semantic discovery folder")
        .set_directory(&project.root)
        .blocking_pick_folder();
    let Some(selected) = selected else { return Ok(None); };
    let raw = selected.into_path().map_err(|_| "The selected discovery folder is not a local filesystem path.".to_string())?;
    let canonical = fs::canonicalize(&raw).map_err(|error| io_error("Cannot open selected discovery folder", error))?;
    if !canonical.starts_with(&project.canonical_root) || !canonical.is_dir() {
        return Err("Semantic discovery folders must be inside the active project.".to_string());
    }
    let relative_display_path = relative_display(&project.canonical_root, &canonical)?;
    if relative_display_path.is_empty() {
        return Err("The project root is already covered by the Workbench inventory and cannot be added as a custom discovery folder.".to_string());
    }
    let mut discovery_roots = project.discovery_roots.clone();
    if !discovery_roots.iter().any(|item| item.eq_ignore_ascii_case(&relative_display_path)) {
        discovery_roots.push(relative_display_path.clone());
    }
    let scan = commit_discovery_roots(&app, &state, &project, discovery_roots)?;
    let detected = scan.semantic_files.iter()
        .filter(|info| path_under_relative_directory(&info.path, &relative_display_path))
        .cloned()
        .collect::<Vec<_>>();
    Ok(Some(ProjectProbeResult { scan, probed_root: relative_display_path, detected }))
}

#[tauri::command]
async fn remove_project_probe_path(payload: ProjectProbePayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectScan, String> {
    let project = active_project(&state)?;
    let requested = safe_relative(&payload.path)?.to_string_lossy().replace('\\', "/");
    let discovery_roots = project.discovery_roots.iter()
        .filter(|root| !root.eq_ignore_ascii_case(&requested))
        .cloned()
        .collect::<Vec<_>>();
    commit_discovery_roots(&app, &state, &project, discovery_roots)
}

#[tauri::command]
async fn reset_project_probe_paths(app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectScan, String> {
    let project = active_project(&state)?;
    commit_discovery_roots(&app, &state, &project, Vec::new())
}

#[tauri::command]
fn close_project(state: State<'_, DesktopState>) -> Result<ClosedResult, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    clear_active_project(&state)?;
    Ok(ClosedResult { closed: true })
}

#[tauri::command]
fn set_pending_changes(payload: PendingChangesPayload, state: State<'_, DesktopState>) -> Result<PendingChangesResult, String> {
    state.pending_change_count.store(payload.count, Ordering::Relaxed);
    Ok(PendingChangesResult { pending_changes: payload.count })
}

fn valid_github_repository(value: &str) -> bool {
    let mut parts = value.split('/');
    let owner = parts.next().unwrap_or_default();
    let repo = parts.next().unwrap_or_default();
    !owner.is_empty()
        && !repo.is_empty()
        && parts.next().is_none()
        && owner.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        && repo.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

fn updater_endpoint(channel: &str) -> Result<String, String> {
    if !valid_github_repository(UPDATER_REPOSITORY) {
        return Err("Updater deployment is not configured: HGW_GITHUB_REPOSITORY is missing or invalid.".to_string());
    }
    match channel {
        "stable" => Ok(format!(
            "https://github.com/{}/releases/download/updater-stable/latest.json",
            UPDATER_REPOSITORY
        )),
        "preview" => Ok(format!(
            "https://github.com/{}/releases/download/updater-preview/latest-preview.json",
            UPDATER_REPOSITORY
        )),
        _ => Err("Unknown update channel. Expected stable or preview.".to_string()),
    }
}

fn updater_configured() -> bool {
    UPDATER_DISTRIBUTION_KIND == "installed"
        && valid_github_repository(UPDATER_REPOSITORY)
        && !UPDATER_PUBLIC_KEY.trim().is_empty()
        && !UPDATER_PUBLIC_KEY.trim_start().starts_with("UNCONFIGURED")
}

fn updater_unconfigured_reason() -> String {
    if UPDATER_DISTRIBUTION_KIND != "installed" {
        return "Automatic updates are available only in installed NSIS builds. Development/raw builds do not self-update.".to_string();
    }
    if !valid_github_repository(UPDATER_REPOSITORY) {
        return "Updater deployment is not configured: HGW_GITHUB_REPOSITORY is missing or invalid.".to_string();
    }
    if UPDATER_PUBLIC_KEY.trim().is_empty() || UPDATER_PUBLIC_KEY.trim_start().starts_with("UNCONFIGURED") {
        return "Updater deployment is not configured: updater public key is missing.".to_string();
    }
    "Updater deployment is not configured for this build.".to_string()
}

#[tauri::command]
async fn check_for_update(
    payload: UpdateChannelPayload,
    app: AppHandle,
    pending: State<'_, PendingUpdateState>,
) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    if !updater_configured() {
        if let Ok(mut slot) = pending.update.lock() {
            *slot = None;
        }
        return Ok(UpdateCheckResult {
            configured: false,
            channel: payload.channel,
            current_version,
            available: false,
            version: None,
            notes: None,
            pub_date: None,
            reason: Some(updater_unconfigured_reason()),
        });
    }

    let endpoint = updater_endpoint(&payload.channel)?;
    let endpoint = endpoint.parse().map_err(|error| format!("Invalid updater endpoint: {error}"))?;
    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|error| format!("Cannot configure updater endpoint: {error}"))?
        .pubkey(UPDATER_PUBLIC_KEY.trim())
        .restart_after_install(true)
        .build()
        .map_err(|error| format!("Cannot initialize updater: {error}"))?;
    let update = updater
        .check()
        .await
        .map_err(|error| format!("Update check failed: {error}"))?;

    if let Some(update) = update {
        let version = update.version.clone();
        if payload.channel == "stable" && version.to_string().contains('-') {
            if let Ok(mut slot) = pending.update.lock() {
                *slot = None;
            }
            return Err(format!(
                "Stable update channel rejected prerelease version {version}. Check repository channel publication before retrying."
            ));
        }
        let notes = update.body.clone();
        let pub_date = update.date.map(|date| date.to_string());
        let mut slot = pending.update.lock().map_err(|_| "Pending update state is unavailable.".to_string())?;
        *slot = Some(PendingUpdate { channel: payload.channel.clone(), update });
        Ok(UpdateCheckResult {
            configured: true,
            channel: payload.channel,
            current_version,
            available: true,
            version: Some(version),
            notes,
            pub_date,
            reason: None,
        })
    } else {
        let mut slot = pending.update.lock().map_err(|_| "Pending update state is unavailable.".to_string())?;
        *slot = None;
        Ok(UpdateCheckResult {
            configured: true,
            channel: payload.channel,
            current_version,
            available: false,
            version: None,
            notes: None,
            pub_date: None,
            reason: None,
        })
    }
}

#[tauri::command]
async fn install_update(
    payload: InstallUpdatePayload,
    app: AppHandle,
    desktop: State<'_, DesktopState>,
    pending: State<'_, PendingUpdateState>,
) -> Result<UpdateInstallResult, String> {
    let pending_changes = desktop.pending_change_count.load(Ordering::Relaxed);
    if pending_changes > 0 {
        return Err(format!(
            "Update installation is blocked while {pending_changes} staged project change(s) are pending."
        ));
    }

    let selected = {
        let slot = pending.update.lock().map_err(|_| "Pending update state is unavailable.".to_string())?;
        slot.clone()
    }.ok_or_else(|| "No checked update is ready to install. Check for updates again.".to_string())?;

    if selected.channel != payload.channel || selected.update.version != payload.expected_version {
        return Err("The checked update changed. Check for updates again before installing.".to_string());
    }

    let version = selected.update.version.clone();
    let progress_app = app.clone();
    let finish_app = app.clone();
    let progress_version = version.clone();
    let finish_version = version.clone();
    let mut downloaded: u64 = 0;
    let update = selected.update.restart_after_install(true);
    let bytes = update
        .download(
            move |chunk_length, content_length| {
                downloaded = downloaded.saturating_add(chunk_length as u64);
                let _ = progress_app.emit("app-update-progress", AppUpdateProgress {
                    phase: "downloading".to_string(),
                    version: progress_version.clone(),
                    downloaded_bytes: downloaded,
                    total_bytes: content_length,
                });
            },
            move || {
                let _ = finish_app.emit("app-update-progress", AppUpdateProgress {
                    phase: "downloaded".to_string(),
                    version: finish_version,
                    downloaded_bytes: 0,
                    total_bytes: None,
                });
            },
        )
        .await
        .map_err(|error| format!("Update download or signature verification failed: {error}"))?;

    // Final native write/restart boundary: staged changes may have appeared while the
    // signed package was downloading. Do not trust the earlier UI/native pre-check.
    let pending_changes = desktop.pending_change_count.load(Ordering::Relaxed);
    if pending_changes > 0 {
        let _ = app.emit("app-update-progress", AppUpdateProgress {
            phase: "blocked".to_string(),
            version: version.clone(),
            downloaded_bytes: bytes.len() as u64,
            total_bytes: Some(bytes.len() as u64),
        });
        return Err(format!(
            "Update was downloaded and verified, but installation is blocked because {pending_changes} staged project change(s) are now pending. Resolve them, then check for updates again."
        ));
    }

    let _ = app.emit("app-update-progress", AppUpdateProgress {
        phase: "installing".to_string(),
        version: version.clone(),
        downloaded_bytes: bytes.len() as u64,
        total_bytes: Some(bytes.len() as u64),
    });
    update
        .install(&bytes)
        .map_err(|error| format!("Update installation failed: {error}"))?;

    Ok(UpdateInstallResult { started: true, version })
}

#[tauri::command]
fn exit_application(app: AppHandle, state: State<'_, DesktopState>) -> Result<ExitingResult, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    app.exit(0);
    Ok(ExitingResult { exiting: true })
}

#[tauri::command]
fn read_project_file(payload: ProjectPathPayload, state: State<'_, DesktopState>) -> Result<Response, String> {
    let project = active_project(&state)?;
    let path = resolve_existing_project_file(&project, &payload.path)?;
    let data = fs::read(path).map_err(|error| io_error(&format!("Cannot read {}", payload.path), error))?;
    Ok(Response::new(data))
}

#[tauri::command]
fn read_project_text_preview(payload: ProjectPathPayload, state: State<'_, DesktopState>) -> Result<ProjectTextPreview, String> {
    let project = active_project(&state)?;
    let path = resolve_existing_project_file(&project, &payload.path)?;
    let metadata = fs::metadata(&path).map_err(|error| io_error(&format!("Cannot inspect {}", payload.path), error))?;
    let size = metadata.len();
    if size > MAX_SOURCE_PREVIEW_BYTES {
        return Ok(ProjectTextPreview { path: payload.path, size, kind: "too-large".to_string(), text: None });
    }
    let bytes = fs::read(&path).map_err(|error| io_error(&format!("Cannot preview {}", payload.path), error))?;
    match String::from_utf8(bytes) {
        Ok(text) => Ok(ProjectTextPreview { path: payload.path, size, kind: "text".to_string(), text: Some(text) }),
        Err(_) => Ok(ProjectTextPreview { path: payload.path, size, kind: "binary".to_string(), text: None }),
    }
}

#[tauri::command]
async fn check_conflicts(payload: FilesPayload, state: State<'_, DesktopState>) -> Result<ConflictsResult, String> {
    let project = active_project(&state)?;
    let mut conflicts = Vec::new();
    for file in payload.files {
        let path = match resolve_existing_project_file(&project, &file.path) {
            Ok(path) => path,
            Err(_) => { conflicts.push(file.path); continue; }
        };
        let current = match fs::read_to_string(path) {
            Ok(value) => value,
            Err(_) => { conflicts.push(file.path); continue; }
        };
        if current != file.text { conflicts.push(file.path); }
    }
    conflicts.sort();
    Ok(ConflictsResult { conflicts })
}

#[derive(Debug)]
struct PreparedApplyFile {
    target: PathBuf,
    temp: PathBuf,
    backup: PathBuf,
    display: String,
    expected: String,
    text: String,
}

fn transaction_file(path: &Path, txn_id: u64, kind: &str) -> Result<PathBuf, String> {
    let name = path.file_name().and_then(|value| value.to_str()).ok_or_else(|| "Project file name is not valid UTF-8.".to_string())?;
    Ok(path.with_file_name(format!(".{name}.hgw-txn-{txn_id}.{kind}")))
}

fn secure_original_for_apply(entry: &PreparedApplyFile) -> Result<bool, String> {
    fs::rename(&entry.target, &entry.backup)
        .map_err(|error| io_error(&format!("Cannot secure original before apply: {}", entry.target.display()), error))?;
    let current = fs::read_to_string(&entry.backup)
        .map_err(|error| io_error(&format!("Cannot revalidate apply source: {}", entry.display), error))?;
    Ok(current == entry.expected)
}

fn sync_committed_apply_target(entry: &PreparedApplyFile) -> Result<(), String> {
    // The atomic rename installed Workbench's staged file. Do not compare content and
    // roll back here: a later external writer is newer authority and must be allowed to
    // win. The watcher will surface a differing post-Apply write.
    fs::File::open(&entry.target)
        .and_then(|file| file.sync_all())
        .map_err(|error| io_error(&format!("Cannot sync applied target: {}", entry.display), error))
}

fn rollback_prepared(prepared: &[PreparedApplyFile]) -> Result<(), String> {
    let mut failures = Vec::new();

    // Temp files are transaction-owned, so they may always be removed independently.
    for entry in prepared.iter().rev() {
        if entry.temp.exists() {
            if let Err(error) = fs::remove_file(&entry.temp) {
                failures.push(io_error(&format!("Cannot remove staged Apply file {}", entry.temp.display()), error));
            }
        }
    }

    // Before restoring any backup, prove every currently visible target is still the
    // replacement Workbench wrote. This prevents partial rollback and, critically,
    // prevents deleting a newer external edit that arrived after Workbench's rename.
    for entry in prepared.iter().rev() {
        if !entry.backup.exists() || !entry.target.exists() { continue; }
        let metadata = match fs::symlink_metadata(&entry.target) {
            Ok(metadata) => metadata,
            Err(error) => {
                failures.push(io_error(&format!("Cannot inspect partially committed Apply target {}", entry.target.display()), error));
                continue;
            }
        };
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
            failures.push(format!("Refusing to overwrite unsafe or newer Apply target {}", entry.target.display()));
            continue;
        }
        match fs::read_to_string(&entry.target) {
            Ok(current) if current == entry.text => {}
            Ok(_) => failures.push(format!(
                "Refusing to overwrite a newer external edit at {}; current file and backup were preserved.",
                entry.display
            )),
            Err(error) => failures.push(io_error(&format!("Cannot inspect partially committed Apply target {}", entry.target.display()), error)),
        }
    }
    if !failures.is_empty() { return Err(failures.join(" | ")); }

    for entry in prepared.iter().rev() {
        if !entry.backup.exists() { continue; }
        if entry.target.exists() {
            fs::remove_file(&entry.target)
                .map_err(|error| io_error(&format!("Cannot remove partially committed Apply target {}", entry.target.display()), error))?;
        }
        fs::rename(&entry.backup, &entry.target)
            .map_err(|error| io_error(&format!("Cannot restore Apply backup {}", entry.backup.display()), error))?;
    }
    Ok(())
}

fn rollback_apply_failure(
    app: &AppHandle,
    prepared: &[PreparedApplyFile],
    primary_error: String,
) -> String {
    match rollback_prepared(prepared) {
        Ok(()) => match clear_recovery_journal(app) {
            Ok(()) => primary_error,
            Err(metadata_error) => format!(
                "{primary_error} Automatic rollback succeeded, but recovery metadata could not be cleared: {metadata_error}. Reopen this project before applying more changes."
            ),
        },
        Err(rollback_error) => format!(
            "{primary_error} Automatic rollback was incomplete: {rollback_error}. Recovery journal and backups were retained; reopen this project to retry recovery before applying more changes."
        ),
    }
}

fn rollback_apply_conflict(
    app: &AppHandle,
    prepared: &[PreparedApplyFile],
    display: &str,
) -> Result<ApplyResult, String> {
    rollback_prepared(prepared).map_err(|rollback_error| format!(
        "Apply detected a concurrent external change for {display}, but automatic rollback was incomplete: {rollback_error}. Recovery metadata and backups were retained; reopen this project before applying more changes."
    ))?;
    clear_recovery_journal(app).map_err(|metadata_error| format!(
        "Apply detected a concurrent external change for {display} and rolled back safely, but recovery metadata could not be cleared: {metadata_error}. Reopen this project before applying more changes."
    ))?;
    Ok(ApplyResult { conflicts: vec![display.to_string()], written: 0 })
}

#[tauri::command]
fn apply_project_files(payload: ApplyPayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<ApplyResult, String> {
    let _apply_guard = state.apply_transaction_lock.lock().map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    if payload.files.len() > MAX_APPLY_FILES {
        return Err(format!("Apply safety limit exceeded: more than {MAX_APPLY_FILES} files in one transaction."));
    }
    let project = active_project(&state)?;
    ensure_apply_transaction_slot(&app, &project.root)?;
    let mut seen = HashSet::new();
    let mut resolved = Vec::with_capacity(payload.files.len());
    let mut conflicts = Vec::new();

    for file in payload.files {
        if !seen.insert(file.path.clone()) {
            return Err(format!("Duplicate apply path rejected: {}", file.path));
        }
        if file.text.len() as u64 > MAX_JSON_FILE_BYTES {
            return Err(format!("Apply safety limit exceeded for {}.", file.path));
        }
        validate_json_nesting(&file.text, &file.path)?;
        serde_json::from_str::<serde_json::Value>(&file.text)
            .map_err(|error| io_error(&format!("Apply rejected invalid JSON for {}", file.path), error))?;
        let path = match resolve_existing_project_file(&project, &file.path) {
            Ok(path) => path,
            Err(_) => { conflicts.push(file.path); continue; }
        };
        match fs::read_to_string(&path) {
            Ok(current) if current == file.expected => resolved.push((path, file.path, file.expected, file.text)),
            _ => conflicts.push(file.path),
        }
    }

    if !conflicts.is_empty() {
        conflicts.sort();
        return Ok(ApplyResult { conflicts, written: 0 });
    }

    let txn_id = state.next_token.fetch_add(1, Ordering::Relaxed);
    let journal = ApplyRecoveryJournal {
        project_root: project.canonical_root.to_string_lossy().to_string(),
        txn_id,
        files: resolved.iter().map(|(_, display, _, _)| display.clone()).collect(),
        intended_fingerprints: resolved.iter()
            .map(|(_, display, _, text)| (display.clone(), apply_content_fingerprint(text.as_bytes())))
            .collect(),
    };
    write_recovery_journal(&app, &journal)?;
    let mut prepared: Vec<PreparedApplyFile> = Vec::with_capacity(resolved.len());

    for (target, display, expected, text) in resolved {
        let temp = transaction_file(&target, txn_id, "tmp")?;
        let backup = transaction_file(&target, txn_id, "bak")?;
        if temp.exists() || backup.exists() {
            return Err(rollback_apply_failure(
                &app,
                &prepared,
                format!("Apply transaction artifact already exists for {display}. Reopen the project to recover it safely."),
            ));
        }
        prepared.push(PreparedApplyFile { target, temp, backup, display, expected, text });
        let entry = prepared.last().expect("prepared Apply entry");
        if let Err(error) = fs::copy(&entry.target, &entry.temp) {
            let primary = io_error(&format!("Cannot prepare apply transaction for {}", entry.display), error);
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
        if let Err(error) = fs::write(&entry.temp, entry.text.as_bytes()) {
            let primary = io_error(&format!("Cannot stage apply transaction for {}", entry.display), error);
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
        match fs::File::open(&entry.temp).and_then(|file| file.sync_all()) {
            Ok(()) => {}
            Err(error) => {
                let primary = io_error(&format!("Cannot sync staged apply transaction for {}", entry.display), error);
                return Err(rollback_apply_failure(&app, &prepared, primary));
            }
        }
    }

    {
        let mut active = state.active_write_paths.lock().map_err(|_| "Active-write state lock is poisoned.".to_string())?;
        for entry in &prepared { active.insert(entry.target.clone()); }
    }

    for entry in &prepared {
        match secure_original_for_apply(entry) {
            Ok(true) => {}
            Ok(false) => {
                if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
                return rollback_apply_conflict(&app, &prepared, &entry.display);
            }
            Err(primary) => {
                if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
                return Err(rollback_apply_failure(&app, &prepared, primary));
            }
        }
        if let Err(error) = fs::rename(&entry.temp, &entry.target) {
            if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
            let primary = io_error(&format!("Cannot commit apply transaction: {}", entry.target.display()), error);
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
    }

    for entry in &prepared {
        if let Err(primary) = sync_committed_apply_target(entry) {
            if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
    }

    if let Err(error) = mark_recovery_committed(&app, txn_id) {
        if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
        return Err(rollback_apply_failure(
            &app,
            &prepared,
            format!("Cannot commit Apply recovery state: {error}"),
        ));
    }

    if let Ok(mut suppression) = state.watch_suppression.lock() {
        for entry in &prepared {
            suppression.insert(entry.target.clone(), SuppressedWrite { expected: entry.text.clone(), until: Instant::now() + Duration::from_secs(2) });
        }
    }
    if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }

    let mut cleanup_complete = true;
    for entry in &prepared {
        if entry.temp.exists() && fs::remove_file(&entry.temp).is_err() { cleanup_complete = false; }
        if entry.backup.exists() && fs::remove_file(&entry.backup).is_err() { cleanup_complete = false; }
    }
    if cleanup_complete { clear_recovery_journal(&app)?; }

    Ok(ApplyResult { conflicts: Vec::new(), written: prepared.len() })
}

fn select_worldgen_log_from_folder(folder: &Path) -> Result<PathBuf, String> {
    let canonical_folder = fs::canonicalize(folder)
        .map_err(|error| io_error("Cannot canonicalize selected WorldGen log folder", error))?;
    if !canonical_folder.is_dir() {
        return Err("Selected WorldGen log folder is no longer a directory.".to_string());
    }
    let mut newest: Option<(std::time::SystemTime, String, PathBuf)> = None;
    for entry in fs::read_dir(folder)
        .map_err(|error| io_error("Cannot read selected WorldGen log folder", error))?
    {
        let entry = entry.map_err(|error| io_error("Cannot enumerate selected WorldGen log folder", error))?;
        let file_type = entry.file_type().map_err(|error| io_error("Cannot inspect WorldGen log folder entry", error))?;
        if !file_type.is_file() || file_type.is_symlink() { continue; }
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.to_ascii_lowercase().ends_with(".log") { continue; }
        let metadata = entry.metadata().map_err(|error| io_error("Cannot inspect WorldGen log folder entry metadata", error))?;
        let modified = metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let sort_name = name.to_ascii_lowercase();
        let replace = newest.as_ref().map(|(best_modified, best_name, _)| {
            modified > *best_modified || (modified == *best_modified && sort_name > *best_name)
        }).unwrap_or(true);
        if replace { newest = Some((modified, sort_name, entry.path())); }
    }
    let selected = newest
        .map(|(_, _, path)| path)
        .ok_or_else(|| "No .log file was found in the selected folder.".to_string())?;
    let metadata = fs::symlink_metadata(&selected).map_err(|error| io_error("Cannot inspect resolved WorldGen log", error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
        return Err("Resolved WorldGen log must be a regular local file.".to_string());
    }
    let canonical = fs::canonicalize(selected).map_err(|error| io_error("Cannot canonicalize resolved WorldGen log", error))?;
    if !canonical.starts_with(&canonical_folder) {
        return Err("Resolved WorldGen log escaped the selected log folder; choose the folder again.".to_string());
    }
    Ok(canonical)
}

#[tauri::command]
async fn select_worldgen_log(app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<WorldgenLogSelection>, String> {
    let selected = app.dialog().file()
        .set_title("Choose Hytale WorldGen log")
        .add_filter("Hytale logs", &["log", "txt"])
        .blocking_pick_file();
    let Some(selected) = selected else { return Ok(None); };
    let raw = selected.into_path().map_err(|_| "The selected log is not a local filesystem path.".to_string())?;
    let metadata = fs::symlink_metadata(&raw).map_err(|error| io_error("Cannot inspect selected WorldGen log", error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
        return Err("Selected WorldGen log must be a regular local file, not a symlink, junction or directory.".to_string());
    }
    let path = fs::canonicalize(&raw).map_err(|error| io_error("Cannot canonicalize selected WorldGen log", error))?;
    let token = format!("worldgen-log-{}", state.next_token.fetch_add(1, Ordering::Relaxed));
    let mut logs = state.worldgen_logs.lock().map_err(|_| "WorldGen-log state lock is poisoned.".to_string())?;
    logs.clear();
    logs.insert(token.clone(), WorldgenLogSource::File(path.clone()));
    Ok(Some(WorldgenLogSelection { token, name: path_label(&path), source_kind: "file".to_string() }))
}

#[tauri::command]
async fn select_worldgen_log_folder(app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<WorldgenLogSelection>, String> {
    let selected = app.dialog().file()
        .set_title("Choose Hytale log folder")
        .blocking_pick_folder();
    let Some(selected) = selected else { return Ok(None); };
    let raw = selected.into_path().map_err(|_| "The selected log folder is not a local filesystem path.".to_string())?;
    let metadata = fs::symlink_metadata(&raw).map_err(|error| io_error("Cannot inspect selected WorldGen log folder", error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_dir() {
        return Err("Selected WorldGen log folder must be a regular local directory, not a symlink or junction.".to_string());
    }
    let path = fs::canonicalize(&raw).map_err(|error| io_error("Cannot canonicalize selected WorldGen log folder", error))?;
    let token = format!("worldgen-folder-{}", state.next_token.fetch_add(1, Ordering::Relaxed));
    let mut logs = state.worldgen_logs.lock().map_err(|_| "WorldGen-log state lock is poisoned.".to_string())?;
    logs.clear();
    logs.insert(token.clone(), WorldgenLogSource::Folder(path.clone()));
    Ok(Some(WorldgenLogSelection { token, name: path_label(&path), source_kind: "folder".to_string() }))
}

#[tauri::command]
fn revoke_worldgen_log(payload: WorldgenLogPayload, state: State<'_, DesktopState>) -> Result<(), String> {
    state.worldgen_logs.lock().map_err(|_| "WorldGen-log state lock is poisoned.".to_string())?.remove(&payload.token);
    Ok(())
}

#[tauri::command]
async fn read_worldgen_performance(payload: WorldgenLogPayload, state: State<'_, DesktopState>) -> Result<WorldgenPerformanceResult, String> {
    let source = state.worldgen_logs.lock().map_err(|_| "WorldGen-log state lock is poisoned.".to_string())?
        .get(&payload.token).cloned().ok_or_else(|| "The selected WorldGen log source is no longer registered. Choose it again.".to_string())?;
    let path = match source {
        WorldgenLogSource::File(path) => path,
        WorldgenLogSource::Folder(folder) => {
            revalidate_authorized_directory(&folder, &folder, "Selected WorldGen log folder")?;
            select_worldgen_log_from_folder(&folder)?
        }
    };
    let metadata = fs::symlink_metadata(&path).map_err(|error| io_error("Cannot inspect selected WorldGen log", error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
        return Err("The selected WorldGen log is no longer a regular local file. Choose it again.".to_string());
    }
    let (bytes_scanned, lines_scanned, truncated, report) = read_worldgen_performance_log(&path)?;
    Ok(WorldgenPerformanceResult { name: path_label(&path), bytes_scanned, lines_scanned, truncated, report })
}

#[tauri::command]
async fn select_output_directory(app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<OutputDirectoryResult>, String> {
    let project = active_project(&state)?;
    let mut dialog = app.dialog().file().set_title("Choose Workbench output folder");
    if let Some(parent) = project.root.parent() { dialog = dialog.set_directory(parent); }
    let Some(selected) = dialog.blocking_pick_folder() else { return Ok(None); };
    let root = fs::canonicalize(selected.into_path().map_err(|_| "The selected output is not a local filesystem path.".to_string())?)
        .map_err(|error| io_error("Cannot open output directory", error))?;
    if !root.is_dir() { return Err("Selected output path is not a directory.".to_string()); }

    let is_source = root == project.canonical_root;
    if !is_source && (root.starts_with(&project.canonical_root) || project.canonical_root.starts_with(&root)) {
        return Err("Choose an output folder outside the source project tree to avoid recursive or destructive copies.".to_string());
    }
    let token = format!("output-{}", state.next_token.fetch_add(1, Ordering::Relaxed));
    state.output_roots.lock().map_err(|_| "Output state lock is poisoned.".to_string())?.insert(token.clone(), root.clone());
    Ok(Some(OutputDirectoryResult { kind: "desktop-output", token, name: path_label(&root), is_source }))
}

#[tauri::command]
async fn existing_output_files(payload: OutputPathsPayload, state: State<'_, DesktopState>) -> Result<ExistingResult, String> {
    let root = output_root(&state, &payload.token)?;
    let mut existing = Vec::new();
    for raw in payload.paths {
        let target = inspect_output_path(&root, &raw)?;
        if target.exists() { existing.push(raw); }
    }
    existing.sort();
    Ok(ExistingResult { existing })
}

#[tauri::command]
async fn export_output(payload: ExportPayload, state: State<'_, DesktopState>) -> Result<WrittenResult, String> {
    let project = active_project(&state)?;
    let output = output_root(&state, &payload.token)?;
    let changed: HashMap<String, String> = payload.changed_files.into_iter().map(|file| (file.path, file.text)).collect();
    let mut paths = if payload.scope == "full" {
        scan_tree(&project.root, &project.discovery_roots)?.entries
    } else if payload.scope == "changed" {
        changed.keys().cloned().collect()
    } else {
        return Err(format!("Unknown output scope: {}", payload.scope));
    };
    if payload.scope == "full" { paths.extend(changed.keys().cloned()); }
    let mut unique = HashSet::new();
    paths.retain(|path| unique.insert(path.clone()));
    paths.sort();

    let mut written = 0usize;
    for raw in paths {
        let target = ensure_output_path(&output, &raw)?;
        if let Some(text) = changed.get(&raw) {
            fs::write(&target, text.as_bytes()).map_err(|error| io_error(&format!("Cannot write output {raw}"), error))?;
        } else {
            let source = resolve_existing_project_file(&project, &raw)?;
            fs::copy(&source, &target).map_err(|error| io_error(&format!("Cannot copy output {raw}"), error))?;
        }
        written += 1;
    }
    Ok(WrittenResult { written })
}


fn save_target_extension(kind: SaveTargetKind) -> &'static str {
    match kind {
        SaveTargetKind::Zip => "zip",
        SaveTargetKind::SupportJson => "json",
    }
}

fn register_save_target_path(path: PathBuf, kind: SaveTargetKind) -> Result<RegisteredSaveTarget, String> {
    if path.file_name().is_none() {
        return Err("Invalid save target path.".to_string());
    }
    let expected_extension = save_target_extension(kind);
    if !path.extension().and_then(|value| value.to_str()).map(|value| value.eq_ignore_ascii_case(expected_extension)).unwrap_or(false) {
        return Err(match kind {
            SaveTargetKind::Zip => "ZIP export target must use the .zip extension.".to_string(),
            SaveTargetKind::SupportJson => "Diagnostic report target must use the .json extension.".to_string(),
        });
    }
    let parent = path.parent().ok_or_else(|| "Save target has no parent directory.".to_string())?;
    let canonical_parent = fs::canonicalize(parent).map_err(|error| io_error("Cannot canonicalize selected save-target directory", error))?;
    if !canonical_parent.is_dir() {
        return Err("Selected save-target parent is not a directory.".to_string());
    }
    if path.exists() {
        let metadata = fs::symlink_metadata(&path).map_err(|error| io_error("Cannot inspect selected save target", error))?;
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || metadata.is_dir() {
            return Err(match kind {
                SaveTargetKind::Zip => "Refusing to write a ZIP through a symlink/junction or directory target.".to_string(),
                SaveTargetKind::SupportJson => "Refusing to write a diagnostic report through a symlink/junction or directory target.".to_string(),
            });
        }
    }
    Ok(RegisteredSaveTarget { path, canonical_parent, kind })
}

fn revalidate_registered_save_target(target: &RegisteredSaveTarget) -> Result<(), String> {
    let expected_extension = save_target_extension(target.kind);
    if !target.path.extension().and_then(|value| value.to_str()).map(|value| value.eq_ignore_ascii_case(expected_extension)).unwrap_or(false) {
        return Err("Registered save target no longer matches its authorized file type.".to_string());
    }
    let parent = target.path.parent().ok_or_else(|| "Registered save target has no parent directory.".to_string())?;
    let canonical_parent = fs::canonicalize(parent).map_err(|error| io_error("Cannot revalidate save-target directory", error))?;
    if canonical_parent != target.canonical_parent {
        return Err("Registered save-target directory changed after authorization; select the target again.".to_string());
    }
    if target.path.exists() {
        let metadata = fs::symlink_metadata(&target.path).map_err(|error| io_error("Cannot revalidate save target", error))?;
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || metadata.is_dir() {
            return Err("Registered save target became a symlink/junction/reparse point or directory; select the target again.".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
async fn select_save_target(payload: SuggestedSavePayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<SaveTargetResult>, String> {
    let suggested = Path::new(&payload.suggested_name).file_name().and_then(|value| value.to_str()).filter(|value| !value.trim().is_empty()).unwrap_or("HytaleProject-Changed-Files.zip");
    let selected = app.dialog().file()
        .set_title("Save Workbench ZIP")
        .set_file_name(suggested)
        .add_filter("ZIP archive", &["zip"])
        .blocking_save_file();
    let Some(selected) = selected else { return Ok(None); };
    let path = selected.into_path().map_err(|_| "The selected save target is not a local filesystem path.".to_string())?;
    let registered = register_save_target_path(path, SaveTargetKind::Zip)?;
    let name = path_label(&registered.path);
    let token = format!("save-{}", state.next_token.fetch_add(1, Ordering::Relaxed));
    state.save_targets.lock().map_err(|_| "Save-target state lock is poisoned.".to_string())?.insert(token.clone(), registered);
    Ok(Some(SaveTargetResult { token, name }))
}


#[tauri::command]
async fn select_support_report_target(payload: SuggestedSavePayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<Option<SaveTargetResult>, String> {
    let suggested = Path::new(&payload.suggested_name)
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Hytale-Generator-Workbench-Diagnostic.json");
    let selected = app.dialog().file()
        .set_title("Save Workbench diagnostic report")
        .set_file_name(suggested)
        .add_filter("JSON diagnostic report", &["json"])
        .blocking_save_file();
    let Some(selected) = selected else { return Ok(None); };
    let path = selected.into_path().map_err(|_| "The selected diagnostic-report target is not a local filesystem path.".to_string())?;
    let registered = register_save_target_path(path, SaveTargetKind::SupportJson)?;
    let name = path_label(&registered.path);
    let token = format!("support-{}", state.next_token.fetch_add(1, Ordering::Relaxed));
    state.save_targets.lock().map_err(|_| "Save-target state lock is poisoned.".to_string())?.insert(token.clone(), registered);
    Ok(Some(SaveTargetResult { token, name }))
}

#[tauri::command]
fn write_registered_binary(request: Request<'_>, state: State<'_, DesktopState>) -> Result<(), String> {
    let token = request.headers().get("X-Hytale-Save-Token").and_then(|value| value.to_str().ok())
        .ok_or_else(|| "Missing native save token.".to_string())?;
    let target = state.save_targets.lock().map_err(|_| "Save-target state lock is poisoned.".to_string())?.remove(token)
        .ok_or_else(|| "Native save token is no longer valid.".to_string())?;
    let InvokeBody::Raw(bytes) = request.body() else { return Err("Expected binary export data.".to_string()); };
    revalidate_registered_save_target(&target)?;
    fs::write(&target.path, bytes).map_err(|error| io_error(&format!("Cannot save {}", target.path.display()), error))?;
    Ok(())
}

#[tauri::command]
fn persistent_log_status(app: AppHandle, state: State<'_, DesktopState>) -> Result<PersistentLogStatus, String> {
    let _guard = state.persistent_log_lock.lock().map_err(|_| "Persistent-log state lock is poisoned.".to_string())?;
    persistent_log_status_for(&app)
}

#[tauri::command]
fn append_persistent_log_batch(payload: PersistentLogBatchPayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<PersistentLogStatus, String> {
    if payload.entries.is_empty() { return persistent_log_status_for(&app); }
    if payload.entries.len() > PERSISTENT_LOG_MAX_BATCH_ENTRIES {
        return Err("Persistent-log batch is too large.".to_string());
    }
    let _guard = state.persistent_log_lock.lock().map_err(|_| "Persistent-log state lock is poisoned.".to_string())?;
    let directory = persistent_log_directory(&app)?;
    let mut encoded = Vec::with_capacity(payload.entries.len());
    let mut batch_bytes = 0usize;
    for entry in payload.entries {
        let bytes = serde_json::to_vec(&entry).map_err(|error| io_error("Cannot serialize persistent-log entry", error))?;
        if bytes.len() > PERSISTENT_LOG_MAX_ENTRY_BYTES {
            return Err("Persistent-log entry exceeds the size limit.".to_string());
        }
        batch_bytes = batch_bytes.saturating_add(bytes.len() + 1);
        if batch_bytes > PERSISTENT_LOG_MAX_BATCH_BYTES {
            return Err("Persistent-log batch exceeds the byte limit.".to_string());
        }
        encoded.push(bytes);
    }
    let current = persistent_log_path(&directory, 0);
    let current_bytes = inspect_persistent_log_file(&current)?;
    if current_bytes > 0 && current_bytes.saturating_add(batch_bytes as u64) > PERSISTENT_LOG_MAX_FILE_BYTES {
        rotate_persistent_logs(&directory)?;
    }
    let current = persistent_log_path(&directory, 0);
    inspect_persistent_log_file(&current)?;
    let mut file = OpenOptions::new().create(true).append(true).open(&current)
        .map_err(|error| io_error("Cannot open persistent log", error))?;
    for bytes in encoded {
        file.write_all(&bytes).map_err(|error| io_error("Cannot append persistent log", error))?;
        file.write_all(b"\n").map_err(|error| io_error("Cannot append persistent log newline", error))?;
    }
    file.flush().map_err(|error| io_error("Cannot flush persistent log", error))?;
    persistent_log_status_for(&app)
}

#[tauri::command]
fn clear_persistent_logs(app: AppHandle, state: State<'_, DesktopState>) -> Result<PersistentLogStatus, String> {
    let _guard = state.persistent_log_lock.lock().map_err(|_| "Persistent-log state lock is poisoned.".to_string())?;
    let directory = persistent_log_directory(&app)?;
    for generation in 0..PERSISTENT_LOG_RETAINED_FILES {
        let path = persistent_log_path(&directory, generation);
        if !path.exists() { continue; }
        inspect_persistent_log_file(&path)?;
        fs::remove_file(&path).map_err(|error| io_error("Cannot clear persistent log", error))?;
    }
    persistent_log_status_for(&app)
}

#[cfg(all(test, windows))]
mod windows_scan_safety_tests {
    use super::*;
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn authorized_directory_retarget_is_rejected() {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).expect("clock").as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-authority-retarget-{unique}"));
        let authorized = base.join("authorized");
        let moved = base.join("authorized-original");
        let outside = base.join("outside");
        fs::create_dir_all(&authorized).expect("create authorized fixture");
        fs::create_dir_all(&outside).expect("create outside fixture");
        let expected = fs::canonicalize(&authorized).expect("canonicalize authorized fixture");
        fs::rename(&authorized, &moved).expect("move authorized fixture");
        let status = Command::new("cmd").arg("/C").arg("mklink").arg("/J").arg(&authorized).arg(&outside)
            .status().expect("run mklink /J");
        assert!(status.success());
        revalidate_authorized_directory(&authorized, &expected, "Fixture authority")
            .expect_err("retargeted authority must be rejected");
        fs::remove_dir(&authorized).expect("remove authority junction");
        fs::remove_dir_all(&base).expect("clean authority fixture");
    }

    #[test]
    fn output_authority_retarget_is_rejected_before_write() {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).expect("clock").as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-output-retarget-{unique}"));
        let output = base.join("output");
        let moved = base.join("output-original");
        let outside = base.join("outside");
        fs::create_dir_all(&output).expect("create output fixture");
        fs::create_dir_all(&outside).expect("create outside fixture");
        let expected = fs::canonicalize(&output).expect("canonicalize output fixture");
        fs::rename(&output, &moved).expect("move output fixture");
        let status = Command::new("cmd").arg("/C").arg("mklink").arg("/J").arg(&output).arg(&outside)
            .status().expect("run mklink /J");
        assert!(status.success());
        revalidate_authorized_directory(&output, &expected, "Selected output folder")
            .expect_err("retargeted output authority must be rejected");
        assert!(!outside.join("escape.json").exists());
        fs::remove_dir(&output).expect("remove output junction");
        fs::remove_dir_all(&base).expect("clean output fixture");
    }

    #[test]
    fn worldgen_folder_authority_retarget_is_rejected() {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).expect("clock").as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-worldgen-retarget-{unique}"));
        let folder = base.join("logs");
        let moved = base.join("logs-original");
        let outside = base.join("outside");
        fs::create_dir_all(&folder).expect("create log folder fixture");
        fs::create_dir_all(&outside).expect("create outside fixture");
        fs::write(outside.join("outside.log"), b"outside").expect("write outside log");
        let expected = fs::canonicalize(&folder).expect("canonicalize log folder fixture");
        fs::rename(&folder, &moved).expect("move log folder fixture");
        let status = Command::new("cmd").arg("/C").arg("mklink").arg("/J").arg(&folder).arg(&outside)
            .status().expect("run mklink /J");
        assert!(status.success());
        revalidate_authorized_directory(&folder, &expected, "Selected WorldGen log folder")
            .expect_err("retargeted WorldGen authority must be rejected");
        fs::remove_dir(&folder).expect("remove WorldGen junction");
        fs::remove_dir_all(&base).expect("clean WorldGen fixture");
    }

    #[test]
    fn project_scan_rejects_external_junction_and_reports_reparse() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-reparse-safety-{unique}"));
        let project = base.join("project");
        let outside = base.join("outside");
        fs::create_dir_all(&project).expect("create project fixture");
        fs::create_dir_all(&outside).expect("create outside fixture");
        fs::write(project.join("inside.txt"), b"inside").expect("write inside fixture");
        fs::write(outside.join("secret.txt"), b"outside").expect("write outside fixture");

        let junction = project.join("external-junction");
        let status = Command::new("cmd")
            .arg("/C")
            .arg("mklink")
            .arg("/J")
            .arg(&junction)
            .arg(&outside)
            .status()
            .expect("run mklink /J");
        assert!(status.success(), "mklink /J must succeed for the Windows containment fixture");

        let scan = scan_tree_traced(&project, &[], Some("windows-reparse-safety".to_string()))
            .expect("scan project fixture");
        assert!(scan.entries.iter().any(|entry| entry == "inside.txt"));
        assert!(
            scan.entries.iter().all(|entry| !entry.starts_with("external-junction")),
            "scanner must not inventory files reached through an external junction"
        );

        let trace = scan.native_trace.expect("native trace");
        let file_phase = trace.phases.iter()
            .find(|phase| phase.name == "desktop.project.inventory.file-canonicalize")
            .expect("file canonicalization trace phase");
        assert_eq!(file_phase.data.get("containmentRejects").copied().unwrap_or(0), 0);
        assert_eq!(file_phase.data.get("fastPathCandidates").copied().unwrap_or(0), 1);
        assert_eq!(file_phase.data.get("fastPathUsed").copied().unwrap_or(0), 1);
        assert_eq!(file_phase.data.get("canonicalizationChecks").copied().unwrap_or(0), 0);
        let reparse_entries = file_phase.data.get("reparsePointEntries").copied().unwrap_or(0);
        assert!(reparse_entries >= 1, "junction must be visible to the reparse counter");

        fs::remove_dir(&junction).expect("remove Windows junction fixture");
        fs::remove_dir_all(&base).expect("clean Windows containment fixture");
    }

    #[test]
    fn worldgen_reverse_scan_has_no_legacy_tail_limit() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-worldgen-unbounded-{unique}"));
        fs::create_dir_all(&base).expect("create WorldGen scan fixture");
        let log = base.join("2026-09-08_17-12-56_server.log");
        let mut file = File::create(&log).expect("create WorldGen log fixture");
        file.write_all(br#"[2026/09/08 15:23:40   INFO]               [HytaleGenerator] Performance Report
Sample Count: 1
WorldStructure Name: Ps_SingleBiomeTest
Total: 62.207 ms
Content Generation: 58.55 ms
Data Transfer: 4.136 ms
Memory Usage Report
Buffers Memory Usage: 142 mb
Buffer Cache Report
Total Cache Buffer Requests: 177859
Missed Cache Buffer Requests: 57892
Missed/Total Ratio: 32.54937900246825%
"#).expect("write WorldGen report fixture");
        let spam = b"[2026/09/08 15:30:00 ERROR] synthetic error spam after report.................................................................\n";
        while file.metadata().expect("inspect WorldGen fixture").len() <= WORLDGEN_LOG_SCAN_CHUNK_BYTES + 128 * 1024 {
            file.write_all(spam).expect("append WorldGen spam fixture");
        }
        file.flush().expect("flush WorldGen fixture");
        drop(file);

        let (bytes_scanned, _lines_scanned, truncated, report) = read_worldgen_performance_log(&log).expect("scan WorldGen fixture");
        assert!(bytes_scanned > WORLDGEN_LOG_SCAN_CHUNK_BYTES, "scanner must continue past the old 1 MiB cutoff");
        assert!(!truncated, "unlimited reverse scan must not report a synthetic tail truncation");
        assert_eq!(report.expect("older complete WorldGen report").sample_count, 1);
        fs::remove_dir_all(&base).expect("clean WorldGen scan fixture");
    }

    #[test]
    fn worldgen_malformed_candidate_is_bounded_without_limiting_whole_file_scan() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-worldgen-candidate-bound-{unique}"));
        fs::create_dir_all(&base).expect("create WorldGen candidate fixture");
        let log = base.join("2026-09-08_17-12-56_server.log");
        let mut file = File::create(&log).expect("create WorldGen candidate log");
        file.write_all(br#"[2026/09/08 15:23:40   INFO]               [HytaleGenerator] Performance Report
Sample Count: 1
WorldStructure Name: OlderComplete
Total: 62.207 ms
Content Generation: 58.55 ms
Data Transfer: 4.136 ms
Memory Usage Report
Buffers Memory Usage: 142 mb
Buffer Cache Report
Total Cache Buffer Requests: 177859
Missed Cache Buffer Requests: 57892
Missed/Total Ratio: 32.54937900246825%
[2026/09/08 15:30:00   INFO]               [HytaleGenerator] Performance Report
Sample Count: 2
WorldStructure Name: NewerMalformed
Total: 1 ms
"#).expect("write complete and malformed WorldGen reports");
        let spam = vec![b'x'; WORLDGEN_REPORT_CANDIDATE_MAX_BYTES as usize + 4096];
        file.write_all(&spam).expect("append oversized malformed report body");
        file.flush().expect("flush WorldGen candidate fixture");
        drop(file);

        let (bytes_scanned, _lines_scanned, truncated, report) = read_worldgen_performance_log(&log).expect("scan bounded candidate fixture");
        assert!(bytes_scanned > WORLDGEN_REPORT_CANDIDATE_MAX_BYTES, "whole-file reverse scan must continue beyond one candidate bound");
        assert!(!truncated, "candidate memory bound must not become a whole-file truncation");
        let report = report.expect("older complete report behind malformed candidate");
        assert_eq!(report.sample_count, 1);
        assert_eq!(report.world_structure_name, "OlderComplete");
        fs::remove_dir_all(&base).expect("clean WorldGen candidate fixture");
    }

    #[test]
    fn worldgen_folder_always_resolves_newest_log_and_ignores_lock_file() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-worldgen-folder-{unique}"));
        fs::create_dir_all(&base).expect("create WorldGen folder fixture");
        fs::write(base.join("2026-09-07_21-04-53_server.log"), b"older").expect("write older log");
        fs::write(base.join("2026-09-08_16-28-39_client.log"), b"middle").expect("write middle log");
        fs::write(base.join("2026-09-08_17-12-56_server.log"), b"newest").expect("write newest log");
        fs::write(base.join("2026-09-09_00-00-00_server.log.lck"), b"").expect("write lock file");
        fs::write(base.join("zzz.txt"), b"not a log").expect("write unrelated file");

        let selected = select_worldgen_log_from_folder(&base).expect("resolve newest WorldGen log");
        assert_eq!(selected.file_name().and_then(|value| value.to_str()), Some("2026-09-08_17-12-56_server.log"));
        fs::remove_dir_all(&base).expect("clean WorldGen folder fixture");
    }

    #[test]
    fn registered_save_target_revalidates_parent_authority_before_write() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-save-target-revalidate-{unique}"));
        let authorized = base.join("authorized");
        let moved = base.join("authorized-original");
        let outside = base.join("outside");
        fs::create_dir_all(&authorized).expect("create authorized save directory");
        fs::create_dir_all(&outside).expect("create outside save directory");
        let registered = register_save_target_path(authorized.join("report.json"), SaveTargetKind::SupportJson)
            .expect("register safe support-report target");

        fs::rename(&authorized, &moved).expect("move originally authorized save directory");
        let status = Command::new("cmd")
            .arg("/C")
            .arg("mklink")
            .arg("/J")
            .arg(&authorized)
            .arg(&outside)
            .status()
            .expect("run mklink /J for save-target revalidation");
        assert!(status.success(), "mklink /J must succeed for save-target authority fixture");

        let error = revalidate_registered_save_target(&registered)
            .expect_err("changed save-target parent authority must be rejected");
        assert!(error.contains("changed after authorization"));

        fs::remove_dir(&authorized).expect("remove save-target junction fixture");
        fs::remove_dir_all(&base).expect("clean save-target revalidation fixture");
    }

    #[test]
    fn optional_recovery_metadata_read_fails_closed_on_non_file() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-recovery-metadata-{unique}"));
        fs::create_dir_all(&base).expect("create recovery metadata fixture");
        let missing = base.join("missing.json");
        assert!(read_optional_utf8_file(&missing, "read optional metadata").expect("missing is allowed").is_none());
        let not_a_file = base.join("journal.json");
        fs::create_dir(&not_a_file).expect("create directory at journal path");
        let error = read_optional_utf8_file(&not_a_file, "read recovery metadata")
            .expect_err("non-file recovery metadata must fail closed");
        assert!(error.contains("read recovery metadata"));
        fs::remove_dir_all(&base).expect("clean recovery metadata fixture");
    }

    #[test]
    fn recovery_commit_marker_requires_exact_transaction_identity() {
        assert!(parse_recovery_commit_marker("42
", 42).expect("matching marker"));
        assert!(parse_recovery_commit_marker("41", 42).expect_err("mismatch must fail closed").contains("expects 42"));
        assert!(parse_recovery_commit_marker("not-a-number", 42).expect_err("invalid marker must fail closed").contains("Cannot parse Apply commit marker"));
    }

    #[test]
    fn late_apply_conflict_preserves_external_change_for_rollback() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-apply-late-conflict-{unique}"));
        fs::create_dir_all(&base).expect("create late-conflict fixture");
        let target = base.join("target.json");
        let temp = base.join("temp.json");
        let backup = base.join("backup.json");
        fs::write(&target, br#"{"value":2}"#).expect("write external edit");
        fs::write(&temp, br#"{"value":3}"#).expect("write staged edit");
        let prepared = vec![PreparedApplyFile {
            target: target.clone(),
            temp: temp.clone(),
            backup: backup.clone(),
            display: "target.json".to_string(),
            expected: r#"{"value":1}"#.to_string(),
            text: r#"{"value":3}"#.to_string(),
        }];

        assert!(!secure_original_for_apply(&prepared[0]).expect("secure current file"));
        assert!(backup.exists(), "external edit must be captured as the backup");
        rollback_prepared(&prepared).expect("rollback late conflict");
        assert_eq!(fs::read_to_string(&target).expect("restored target"), r#"{"value":2}"#);
        assert!(!temp.exists());
        assert!(!backup.exists());

        fs::remove_dir_all(&base).expect("clean late-conflict fixture");
    }

    #[test]
    fn rollback_preserves_newer_external_target_and_backup() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-apply-late-writer-{unique}"));
        fs::create_dir_all(&base).expect("create late-writer fixture");
        let target = base.join("target.json");
        let temp = base.join("temp.json");
        let backup = base.join("backup.json");
        fs::write(&target, br#"{"value":4}"#).expect("write newer external target");
        fs::write(&temp, br#"{"value":3}"#).expect("write stale transaction temp");
        fs::write(&backup, br#"{"value":1}"#).expect("write original backup");
        let prepared = vec![PreparedApplyFile {
            target: target.clone(),
            temp: temp.clone(),
            backup: backup.clone(),
            display: "target.json".to_string(),
            expected: r#"{"value":1}"#.to_string(),
            text: r#"{"value":3}"#.to_string(),
        }];

        let error = rollback_prepared(&prepared).expect_err("newer external target must make rollback fail closed");
        assert!(error.contains("newer external edit"));
        assert_eq!(fs::read_to_string(&target).expect("newer target preserved"), r#"{"value":4}"#);
        assert_eq!(fs::read_to_string(&backup).expect("backup preserved"), r#"{"value":1}"#);
        assert!(!temp.exists(), "transaction-owned temp may still be cleaned");
        fs::remove_dir_all(&base).expect("clean late-writer fixture");
    }

    #[test]
    fn apply_content_fingerprint_is_stable_and_content_sensitive() {
        assert_eq!(apply_content_fingerprint(b"same"), apply_content_fingerprint(b"same"));
        assert_ne!(apply_content_fingerprint(b"same"), apply_content_fingerprint(b"different"));
    }

    #[test]
    fn rollback_prepared_surfaces_restore_failure_and_retains_backup() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-rollback-failure-{unique}"));
        fs::create_dir_all(&base).expect("create rollback fixture");
        let target = base.join("target.json");
        let temp = base.join("temp.json");
        let backup = base.join("backup.json");
        // A directory at the target path makes remove_file(target) fail deterministically.
        fs::create_dir(&target).expect("create non-file rollback target");
        fs::write(&temp, b"new").expect("write staged temp");
        fs::write(&backup, b"old").expect("write backup");
        let prepared = vec![PreparedApplyFile {
            target: target.clone(),
            temp: temp.clone(),
            backup: backup.clone(),
            display: "target.json".to_string(),
            expected: "old".to_string(),
            text: "new".to_string(),
        }];

        let error = rollback_prepared(&prepared).expect_err("rollback failure must be surfaced");
        assert!(error.contains("Refusing to overwrite unsafe or newer Apply target"));
        assert!(!temp.exists(), "independent staged temp cleanup should still be attempted");
        assert!(backup.exists(), "backup must be retained when restore cannot complete");

        fs::remove_dir_all(&base).expect("clean rollback fixture");
    }

    #[test]
    fn parses_latest_complete_worldgen_performance_report() {
        let fixture = r#"[2026/09/08 15:24:18   INFO]               [HytaleGenerator] Performance Report
Sample Count: 500
WorldStructure Name: Older
Total: 42.225 ms
    Content Generation: 37.707 ms
        TerrainStage (Stage 2): 35.546 ms
            Preparation: 0.20 ms
            Execution: 35.525 ms
                Async Processes Start: 0.4 ms
    Data Transfer: 4.517 ms
Memory Usage Report
Buffers Memory Usage: 141 mb
Buffer Cache Report
Total Cache Buffer Requests: 439622
Missed Cache Buffer Requests: 124714
Missed/Total Ratio: 28.368%

[2026/09/08 15:24:38   INFO]               [HytaleGenerator] Performance Report
Sample Count: 1000
WorldStructure Name: Ps_SingleBiomeTest
Total: 41.83 ms
    Content Generation: 36.542 ms
        TerrainStage (Stage 2): 34.467 ms
            Preparation: 0.20 ms
            Execution: 34.446 ms
                Async Processes Start: 0.5 ms
    Data Transfer: 4.539 ms
Memory Usage Report
Buffers Memory Usage: 143 mb
Buffer Cache Report
Total Cache Buffer Requests: 658122
Missed Cache Buffer Requests: 188777
Missed/Total Ratio: 28.684195331564666%
"#;
        let lines: Vec<&str> = fixture.lines().collect();
        let latest = lines.iter().enumerate().rev().find(|(_, line)| line.contains(WORLDGEN_PERFORMANCE_MARKER)).unwrap().0;
        let report = parse_worldgen_report(&lines, latest).expect("complete report");
        assert_eq!(report.sample_count, 1000);
        assert_eq!(report.world_structure_name, "Ps_SingleBiomeTest");
        assert!((report.total_ms - 41.83).abs() < f64::EPSILON);
        assert_eq!(report.stages.len(), 1);
        assert_eq!(report.stages[0].name, "TerrainStage");
        assert!((report.missed_total_ratio_percent - 28.684195331564666).abs() < 0.000001);
    }

    #[test]
    fn parses_complete_reference_worldgen_report_block() {
        let fixture = "[2026/09/08 15:23:40   INFO]               [HytaleGenerator] Performance Report
Sample Count: 1
WorldStructure Name: Ps_SingleBiomeTest
Total: 62.207 ms
\tContent Generation: 58.55 ms
\t\tAccess Initialization: 0.452 ms
\t\tBiomeStage (Stage 0): 1.392 ms
\t\t\tPreparation: 0.83 ms
\t\t\tExecution: 1.308 ms
\t\t\t\tAsync Processes Start: 0.878 ms
\t\tBiomeDistanceStage (Stage 1): 0.526 ms
\t\t\tPreparation: 0.39 ms
\t\t\tExecution: 0.486 ms
\t\t\t\tAsync Processes Start: 0.13 ms
\t\tTerrainStage (Stage 2): 54.740 ms
\t\t\tPreparation: 0.100 ms
\t\t\tExecution: 54.628 ms
\t\t\t\tAsync Processes Start: 0.54 ms
\t\tPropStage0 (Stage 3): 0.202 ms
\t\t\tPreparation: 0.106 ms
\t\t\tExecution: 0.90 ms
\t\t\t\tAsync Processes Start: 0.20 ms
\t\tTintStage (Stage 4): 0.163 ms
\t\t\tPreparation: 0.22 ms
\t\t\tExecution: 0.140 ms
\t\t\t\tAsync Processes Start: 0.47 ms
\t\tEnvironmentStage (Stage 5): 0.489 ms
\t\t\tPreparation: 0.19 ms
\t\t\tExecution: 0.469 ms
\t\t\t\tAsync Processes Start: 0.14 ms
\tData Transfer: 4.136 ms
\t\tMaterials Section 0: 1.700 ms
\t\tMaterials Section 1: 2.68 ms
\t\tMaterials Section 9: 2.68 ms
\t\tEnvironment Section 0: 0.553 ms
\t\tEnvironment Section 15: 0.428 ms
\t\tEnvironment Write: 0.55 ms
\t\tTints: 0.142 ms
\t\tEntities: 0.14 ms
\t\tBlock States: 3.392 ms
Memory Usage Report
Buffers Memory Usage: 142 mb
\tEntityResult Grid (Index -5):
\t\tMemory Footprint: 0 mb
\t\tBuffer Count: 640
\tBiome Grid (Index 0):
\t\tMemory Footprint: 43 mb
\t\tBuffer Count: 203040
\tMaterial0 Grid (Index 2):
\t\tMemory Footprint: 61 mb
\t\tBuffer Count: 159120
Context Dependency Report
BiomeStage (Stage 0):
\tOutput Size (Buffer Column): {x=17, z=17}
\tOutput Size (Chunk Column): {x=4.25, z=4.25}
TerrainStage (Stage 2):
\tOutput Size (Buffer Column): {x=6, z=6}
\tOutput Size (Chunk Column): {x=1.5, z=1.5}
EnvironmentStage (Stage 5):
\tOutput Size (Buffer Column): {x=4, z=4}
\tOutput Size (Chunk Column): {x=1.0, z=1.0}
Buffer Cache Report
Total Cache Buffer Requests: 177859
Missed Cache Buffer Requests: 57892
Missed/Total Ratio: 32.54937900246825%
";
        let lines: Vec<&str> = fixture.lines().collect();
        let report = parse_worldgen_report(&lines, 0).expect("complete reference report");
        assert_eq!(report.sample_count, 1);
        assert_eq!(report.world_structure_name, "Ps_SingleBiomeTest");
        assert!((report.total_ms - 62.207).abs() < 0.000001);
        assert!((report.content_generation_ms - 58.55).abs() < 0.000001);
        assert!((report.access_initialization_ms.unwrap() - 0.452).abs() < 0.000001);
        assert_eq!(report.stages.len(), 6);
        assert_eq!(report.stages[2].name, "TerrainStage");
        assert!((report.stages[2].execution_ms.unwrap() - 54.628).abs() < 0.000001);
        assert_eq!(report.data_transfer_timings.first().unwrap().label, "Materials Section 0");
        assert!(report.data_transfer_timings.iter().any(|item| item.label == "Block States" && (item.duration_ms - 3.392).abs() < 0.000001));
        assert_eq!(report.buffers_memory_mb, 142.0);
        assert_eq!(report.memory_grids[0].name, "EntityResult Grid");
        assert_eq!(report.memory_grids[0].index, -5);
        assert_eq!(report.memory_grids[1].buffer_count, Some(203040));
        assert_eq!(report.context_dependencies[0].name, "BiomeStage");
        assert_eq!(report.context_dependencies[0].output_buffer_x, Some(17.0));
        assert_eq!(report.context_dependencies[0].output_chunk_z, Some(4.25));
        assert_eq!(report.total_cache_buffer_requests, 177859);
        assert_eq!(report.missed_cache_buffer_requests, 57892);
        assert!((report.missed_total_ratio_percent - 32.54937900246825).abs() < 0.000001);
    }

    #[test]
    fn ignores_incomplete_newest_worldgen_performance_report() {
        let fixture = r#"[2026/09/08 15:24:18   INFO]               [HytaleGenerator] Performance Report
Sample Count: 500
WorldStructure Name: Complete
Total: 42 ms
Content Generation: 37 ms
Data Transfer: 5 ms
Buffers Memory Usage: 140 mb
Total Cache Buffer Requests: 100
Missed Cache Buffer Requests: 20
Missed/Total Ratio: 20%
[2026/09/08 15:24:38   INFO]               [HytaleGenerator] Performance Report
Sample Count: 1000
WorldStructure Name: Partial
Total: 41 ms
"#;
        let lines: Vec<&str> = fixture.lines().collect();
        let report = lines.iter().enumerate().rev()
            .filter(|(_, line)| worldgen_payload_line(line).contains(WORLDGEN_PERFORMANCE_MARKER))
            .find_map(|(index, _)| parse_worldgen_report(&lines, index))
            .expect("previous complete report");
        assert_eq!(report.world_structure_name, "Complete");
    }

    #[test]
    fn parses_client_wrapped_worldgen_performance_report() {
        let fixture = r#"2026-09-08 17:24:38.2597|INFO||SERVER - [2026/09/08 15:24:38   INFO]               [HytaleGenerator] Performance Report
2026-09-08 17:24:38.2597|INFO||SERVER - Sample Count: 1000
2026-09-08 17:24:38.2597|INFO||SERVER - WorldStructure Name: Ps_SingleBiomeTest
2026-09-08 17:24:38.2597|INFO||SERVER - Total: 41.83 ms
2026-09-08 17:24:38.2597|INFO||SERVER - 	Content Generation: 36.542 ms
2026-09-08 17:24:38.2597|INFO||SERVER - 		TerrainStage (Stage 2): 34.467 ms
2026-09-08 17:24:38.2597|INFO||SERVER - 			Preparation: 0.20 ms
2026-09-08 17:24:38.2597|INFO||SERVER - 			Execution: 34.446 ms
2026-09-08 17:24:38.2597|INFO||SERVER - 				Async Processes Start: 0.5 ms
2026-09-08 17:24:38.2597|INFO||SERVER - 	Data Transfer: 4.539 ms
2026-09-08 17:24:38.2597|INFO||SERVER - Memory Usage Report
2026-09-08 17:24:38.2597|INFO||SERVER - Buffers Memory Usage: 143 mb
2026-09-08 17:24:38.2597|INFO||SERVER - Buffer Cache Report
2026-09-08 17:24:38.2597|INFO||SERVER - Total Cache Buffer Requests: 658122
2026-09-08 17:24:38.2597|INFO||SERVER - Missed Cache Buffer Requests: 188777
2026-09-08 17:24:38.2597|INFO||SERVER - Missed/Total Ratio: 28.684195331564666%
2026-09-08 17:24:39.0000|INFO||SERVER - [2026/09/08 15:24:39   INFO] [World|default] unrelated
"#;
        let lines: Vec<&str> = fixture.lines().collect();
        let latest = lines.iter().enumerate().rev()
            .find(|(_, line)| worldgen_payload_line(line).contains(WORLDGEN_PERFORMANCE_MARKER)).unwrap().0;
        let report = parse_worldgen_report(&lines, latest).expect("wrapped complete report");
        assert_eq!(report.sample_count, 1000);
        assert_eq!(report.world_structure_name, "Ps_SingleBiomeTest");
        assert!((report.total_ms - 41.83).abs() < f64::EPSILON);
        assert_eq!(report.raw_report.lines().next().unwrap(), "[2026/09/08 15:24:38   INFO]               [HytaleGenerator] Performance Report");
        assert!(!report.raw_report.contains("|SERVER - "));
    }

}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_filter(|label| label == "main")
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .manage(DesktopState::default())
        .manage(PendingUpdateState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            if let Ok(grants) = load_recent_grants(&handle) {
                let desktop_state = app.state::<DesktopState>();
                {
                    let recent_grants_lock = desktop_state.recent_grants.lock();
                    if let Ok(mut recent_grants) = recent_grants_lock {
                        *recent_grants = grants;
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let pending_changes = window.state::<DesktopState>().pending_change_count.load(Ordering::Relaxed);
                api.prevent_close();
                let _ = window.emit("app-close-requested", AppCloseRequested { pending_changes });
            }
        })
        .invoke_handler(tauri::generate_handler![
            select_project,
            open_recent_project,
            revoke_recent_project,
            reload_project,
            probe_project_path,
            select_project_probe_path,
            remove_project_probe_path,
            reset_project_probe_paths,
            close_project,
            set_pending_changes,
            check_for_update,
            install_update,
            exit_application,
            read_project_file,
            read_project_text_preview,
            check_conflicts,
            apply_project_files,
            select_worldgen_log,
            select_worldgen_log_folder,
            revoke_worldgen_log,
            read_worldgen_performance,
            select_output_directory,
            existing_output_files,
            export_output,
            select_save_target,
            select_support_report_target,
            write_registered_binary,
            persistent_log_status,
            append_persistent_log_batch,
            clear_persistent_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hytale Generator Workbench");
}
