use super::*;
use serde_json::json;

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        static NEXT: AtomicU64 = AtomicU64::new(1);
        let base = std::env::temp_dir().join(format!("hgw-track12-{}-{}", std::process::id(), NEXT.fetch_add(1, Ordering::Relaxed)));
        fs::create_dir(&base).expect("create unique owned Track 12 fixture");
        Self(base)
    }
}
impl Drop for Fixture { fn drop(&mut self) { fs::remove_dir_all(&self.0).expect("remove owned Track 12 fixture"); } }

fn entry() -> serde_json::Value {
    json!({ "id": 1, "timestamp": "2026-09-22T12:00:00.000Z", "event": "project.open.failed", "traceId": "project-123-1", "level": "error", "durationMs": 12,
        "message": "PRIVATE_CONTENT", "extra": "PRIVATE_CONTENT", "data": { "errorMessage": "PRIVATE_CONTENT", "errorStack": "PRIVATE_CONTENT", "path": "C:/PRIVATE_CONTENT.json", "changedPaths": ["Custom/PRIVATE_CONTENT.json"], "PRIVATE_CONTENT": 1,
            "errorName": "SyntaxError", "nodeCount": 7, "status": "failed", "metadata": { "nodeCount": 3, "password": "PRIVATE_CONTENT" } } })
}

#[test]
fn track12_native_sink_redacts_unsanitized_renderer_payloads() {
    let fixture = Fixture::new();
    append_persistent_entries(&fixture.0, vec![entry()]).unwrap();
    let bytes = fs::read(persistent_log_path(&fixture.0, 0)).unwrap();
    let text = String::from_utf8(bytes).unwrap();
    assert!(!text.contains("PRIVATE_CONTENT"));
    let value: serde_json::Value = serde_json::from_str(text.trim()).unwrap();
    assert_eq!(value["data"]["nodeCount"], 7);
    assert_eq!(value["data"]["metadata"]["nodeCount"], 3);
    assert_eq!(value["data"]["errorName"], "SyntaxError");
    assert_eq!(value["traceId"], "project-123-1");
    assert_eq!(text.lines().count(), 1);
    for invalid in [json!("raw content"), json!({"event":"C:/secret"}), json!({"event":"project.open\nforged"})] {
        assert!(append_persistent_entries(&fixture.0, vec![invalid]).is_err());
    }
    assert_eq!(fs::read_to_string(persistent_log_path(&fixture.0, 0)).unwrap(), text);
}

#[test]
fn track12_native_batch_limits_validate_before_any_write() {
    let fixture = Fixture::new();
    append_persistent_entries(&fixture.0, vec![entry()]).unwrap();
    let path = persistent_log_path(&fixture.0, 0);
    let before = fs::read(&path).unwrap();
    let oversized = json!({"event":"project.open", "message":"x".repeat(PERSISTENT_LOG_MAX_ENTRY_BYTES)});
    assert!(append_persistent_entries(&fixture.0, vec![entry(), oversized]).is_err());
    assert!(append_persistent_entries(&fixture.0, vec![entry(); PERSISTENT_LOG_MAX_BATCH_ENTRIES + 1]).is_err());
    let medium = json!({"event":"project.open", "message":"x".repeat(12 * 1024)});
    assert!(append_persistent_entries(&fixture.0, vec![medium; 100]).is_err());
    assert_eq!(fs::read(path).unwrap(), before);
}

#[test]
fn track12_rotation_keeps_four_bounded_generations_and_clear_removes_all() {
    let fixture = Fixture::new();
    let bytes = serde_json::to_vec(&diagnostic_privacy::persistent_entry(&entry()).unwrap()).unwrap();
    // Fill with valid JSONL up to one record below the file budget, then cross it.
    let line = [bytes.as_slice(), b"\n"].concat();
    let full = line.repeat(PERSISTENT_LOG_MAX_FILE_BYTES as usize / line.len());
    for cycle in 0..7 {
        fs::write(persistent_log_path(&fixture.0, 0), &full).unwrap();
        append_persistent_entries(&fixture.0, vec![entry()]).unwrap();
        for generation in 0..PERSISTENT_LOG_RETAINED_FILES {
            let path = persistent_log_path(&fixture.0, generation);
            if path.exists() { assert!(fs::metadata(path).unwrap().len() <= PERSISTENT_LOG_MAX_FILE_BYTES); }
        }
        assert_eq!(fs::read_dir(&fixture.0).unwrap().count(), (cycle + 2).min(4));
    }
    clear_persistent_log_directory(&fixture.0).unwrap();
    assert_eq!(fs::read_dir(&fixture.0).unwrap().count(), 0);
    clear_persistent_log_directory(&fixture.0).unwrap();
}

#[test]
fn track12_log_directory_and_generations_reject_junctions_before_mutation() {
    let fixture = Fixture::new();
    let outside = fixture.0.join("outside");
    fs::create_dir(&outside).unwrap();
    let sentinel = outside.join("sentinel.txt"); fs::write(&sentinel, b"preserve").unwrap();
    let link = fixture.0.join("logs");
    let status = std::process::Command::new("cmd").args(["/C", "mklink", "/J"]).arg(&link).arg(&outside).output().unwrap();
    assert!(status.status.success(), "junction fixture must be available");
    assert!(prepare_persistent_log_directory(&link).is_err());
    fs::remove_dir(&link).unwrap();
    fs::create_dir(&link).unwrap();
    append_persistent_entries(&link, vec![entry()]).unwrap();
    let current = persistent_log_path(&link, 0);
    let before = fs::read(&current).unwrap();
    let unsafe_generation = persistent_log_path(&link, 2);
    let status = std::process::Command::new("cmd").args(["/C", "mklink", "/J"]).arg(&unsafe_generation).arg(&outside).output().unwrap();
    assert!(status.status.success());
    assert!(append_persistent_entries(&link, vec![entry()]).is_err());
    assert!(rotate_persistent_logs(&link).is_err());
    assert!(clear_persistent_log_directory(&link).is_err());
    assert_eq!(fs::read(&current).unwrap(), before);
    assert_eq!(fs::read(&sentinel).unwrap(), b"preserve");
    fs::remove_dir(unsafe_generation).unwrap();
}
