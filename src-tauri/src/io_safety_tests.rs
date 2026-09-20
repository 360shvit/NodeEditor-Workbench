use super::*;

struct Fixture { base: PathBuf, project: ProjectState, output: PathBuf }

impl Fixture {
    fn new() -> Self {
        static NEXT: AtomicU64 = AtomicU64::new(1);
        let base = std::env::temp_dir().join(format!("hgw-track10-{}-{}", std::process::id(), NEXT.fetch_add(1, Ordering::Relaxed)));
        // Refuse to reuse an old fixture rather than remove unrelated contents.
        fs::create_dir(&base).expect("create unique Track 10 fixture");
        let source = base.join("source");
        let output = base.join("output");
        fs::create_dir(&source).unwrap();
        fs::create_dir(&output).unwrap();
        let root = fs::canonicalize(source).unwrap();
        Self { base, project: ProjectState { root: root.clone(), canonical_root: root, discovery_roots: vec![] }, output }
    }
}

impl Drop for Fixture {
    fn drop(&mut self) { fs::remove_dir_all(&self.base).expect("clean owned Track 10 fixture"); }
}

fn text(path: &str, value: &str) -> TextFile { TextFile { path: path.to_string(), text: value.to_string() } }

#[test]
fn track10_read_limits_count_actual_bytes_and_stop_at_limit_plus_one() {
    let mut cursor = std::io::Cursor::new(b"123456789");
    assert!(read_bounded_bytes(&mut cursor, 4, "fixture").is_err());
    assert_eq!(cursor.position(), 5, "oversized streams must not be fully consumed");
    assert_eq!(read_bounded_bytes(&b"1234"[..], 4, "fixture").unwrap(), b"1234");
    assert!(read_bounded_bytes(&b"x"[..], 0, "fixture").is_err());
    assert!(read_bounded_bytes(&b""[..], 0, "fixture").unwrap().is_empty());
}

#[test]
fn track10_probe_rejects_growth_after_inventory() {
    let fixture = Fixture::new();
    let path = fixture.project.root.join("grown.json");
    let mut file = File::create(&path).unwrap();
    file.write_all(b"{").unwrap();
    file.set_len(MAX_DISCOVERY_PROBE_FILE_BYTES + 1).unwrap();
    drop(file);
    assert!(read_probe_text(&path, "grown.json", 1, &mut 0).is_err(), "stale inventory must not bypass the read limit");
    fs::write(&path, b"{\"x\":1}").unwrap();
    let mut total = 0;
    assert!(read_probe_text(&path, "grown.json", 1, &mut total).unwrap().is_some());
    assert_eq!(total, 7, "budget must use bytes read rather than stale inventory size");
    total = MAX_DISCOVERY_PROBE_TOTAL_BYTES - 6;
    assert!(read_probe_text(&path, "grown.json", 1, &mut total).is_err(), "aggregate budget must also fail closed");
}

#[test]
fn track10_inventory_budget_is_checked_during_enumeration() {
    let fixture = Fixture::new();
    for name in ["c.bin", "a.bin", "b.bin"] { fs::write(fixture.project.root.join(name), b"x").unwrap(); }
    assert!(sorted_directory_entries(&fixture.project.root, 2).is_err());
    let names: Vec<_> = sorted_directory_entries(&fixture.project.root, 3).unwrap().iter().map(|entry| entry.file_name()).collect();
    assert_eq!(names, ["a.bin", "b.bin", "c.bin"].map(std::ffi::OsString::from));
}

#[test]
fn track10_preview_and_semantic_boundaries_are_explicit() {
    let fixture = Fixture::new();
    let path = fixture.project.root.join("preview.txt");
    fs::write(&path, vec![b'a'; MAX_SOURCE_PREVIEW_BYTES as usize]).unwrap();
    let preview = project_text_preview(&path, "preview.txt".into()).unwrap();
    assert_eq!(preview.kind, "text");
    assert_eq!(preview.size, MAX_SOURCE_PREVIEW_BYTES);
    assert_eq!(preview.text.unwrap().len() as u64, MAX_SOURCE_PREVIEW_BYTES);
    File::options().write(true).open(&path).unwrap().set_len(MAX_SOURCE_PREVIEW_BYTES + 1).unwrap();
    assert_eq!(project_text_preview(&path, "preview.txt".into()).unwrap().kind, "too-large");
    fs::write(&path, [0xff, 0xfe, 0x00]).unwrap();
    assert_eq!(project_text_preview(&path, "preview.txt".into()).unwrap().kind, "binary");
    File::options().write(true).open(&path).unwrap().set_len(MAX_BINARY_READ_BYTES + 1).unwrap();
    assert!(read_bounded_file(&path, MAX_BINARY_READ_BYTES, "binary fixture").is_err());

    let semantic = fixture.project.root.join("Density");
    fs::create_dir(&semantic).unwrap();
    let oversized = semantic.join("oversized.json");
    File::create(&oversized).unwrap().set_len(MAX_JSON_FILE_BYTES + 1).unwrap();
    assert!(scan_tree(&fixture.project.root, &[]).is_err());
    fs::remove_file(oversized).unwrap();
    fs::write(semantic.join("deep.json"), format!("{}0{}", "[".repeat(MAX_JSON_NESTING + 1), "]".repeat(MAX_JSON_NESTING + 1))).unwrap();
    assert!(scan_tree(&fixture.project.root, &[]).is_err());
}

#[test]
fn track10_output_preflight_rejects_source_aliases_and_invalid_plans() {
    let fixture = Fixture::new();
    use std::os::windows::ffi::OsStringExt;
    let invalid_name = std::ffi::OsString::from_wide(&[0xd800]);
    assert!(relative_display(&fixture.project.root, &fixture.project.root.join(invalid_name)).is_err());
    let source_file = fixture.project.root.join("original.json");
    fs::write(&source_file, "original").unwrap();
    let child = fixture.project.root.join("child");
    fs::create_dir(&child).unwrap();
    for output in [&fixture.project.root, &child, &fixture.base] {
        assert!(export_project_files(&fixture.project, output, "changed", vec![text("original.json", "changed")], true).is_err());
    }
    assert_eq!(fs::read_to_string(source_file).unwrap(), "original");
    for unsafe_path in ["../escape.json", "/absolute", "C:/absolute", "file:stream", "a/./b", "a//b", "nul.txt", "COM1.json", "file. "] {
        assert!(safe_relative(unsafe_path).is_err(), "unsafe path accepted: {unsafe_path}");
        assert!(export_project_files(&fixture.project, &fixture.output, "changed", vec![text("a.json", "safe"), text(unsafe_path, "bad")], true).is_err());
        assert!(!fixture.output.join("a.json").exists(), "invalid plans must fail before the first output write");
    }
    for paths in [["a.json", "A.json"], ["folder", "folder/file.json"]] {
        assert!(export_project_files(&fixture.project, &fixture.output, "changed", paths.map(|path| text(path, "x")).to_vec(), true).is_err());
    }
    let too_many = (0..=MAX_APPLY_FILES).map(|index| text(&format!("{index}.json"), "{}")).collect();
    assert!(export_project_files(&fixture.project, &fixture.output, "changed", too_many, true).is_err());
    assert_eq!(fs::read_dir(&fixture.output).unwrap().count(), 0);
}

#[test]
fn track10_output_preserves_binary_bytes_and_source_hard_links() {
    let fixture = Fixture::new();
    let original = fixture.project.root.join("original.json");
    fs::write(&original, "original").unwrap();
    fs::hard_link(&original, fixture.output.join("original.json")).unwrap();
    assert!(export_project_files(&fixture.project, &fixture.output, "changed", vec![text("original.json", "changed")], false).is_err());
    let result = export_project_files(&fixture.project, &fixture.output, "changed", vec![text("original.json", "changed")], true).unwrap();
    assert_eq!(result.written, 1);
    assert_eq!(fs::read_to_string(&original).unwrap(), "original", "replacing an output hard link must never truncate its source");
    assert_eq!(fs::read_to_string(fixture.output.join("original.json")).unwrap(), "changed");
    let binary: Vec<u8> = (0..65536).map(|index| (index % 256) as u8).collect();
    fs::write(fixture.project.root.join("asset.bin"), &binary).unwrap();
    let result = export_project_files(&fixture.project, &fixture.output, "full", vec![], true).unwrap();
    assert_eq!(result.written, 2);
    assert_eq!(fs::read(fixture.output.join("asset.bin")).unwrap(), binary);
    assert_eq!(fs::read(fixture.project.root.join("asset.bin")).unwrap(), binary);
}

#[test]
fn track10_staging_failure_and_late_collision_preserve_existing_data() {
    let fixture = Fixture::new();
    let target = fixture.output.join("file.bin");
    fs::write(&target, b"original").unwrap();
    let result = stage_file_replacement(&target, true, |file| {
        file.write_all(b"partial").unwrap();
        Err("injected write failure".to_string())
    }, || Ok(()));
    assert!(result.is_err());
    assert_eq!(fs::read(&target).unwrap(), b"original");
    fs::remove_file(&target).unwrap();
    let result = stage_file_replacement(&target, false, |file| {
        file.write_all(b"candidate").unwrap(); Ok(())
    }, || { fs::write(&target, b"late external file").unwrap(); Ok(()) });
    assert!(result.is_err(), "late collision must not be overwritten without approval");
    assert_eq!(fs::read(&target).unwrap(), b"late external file");
    assert_eq!(fs::read_dir(&fixture.output).unwrap().count(), 1, "failed staging files must be removed");
}

#[test]
fn track10_large_mixed_project_inventory_is_complete_and_deterministic() {
    let fixture = Fixture::new();
    let density = fixture.project.root.join("Density");
    let assets = fixture.project.root.join("Assets");
    fs::create_dir(&density).unwrap();
    fs::create_dir(&assets).unwrap();
    for index in 0..5000 {
        fs::write(density.join(format!("density-{index:05}.json")), format!("{{\"Type\":\"Constant\",\"Value\":{index}}}")).unwrap();
        fs::write(assets.join(format!("asset-{index:05}.bin")), [0, 128, 255, (index % 256) as u8]).unwrap();
    }
    fs::write(density.join("malformed.json"), b"{ malformed").unwrap();
    fs::write(fixture.project.root.join("unknown.txt"), b"not a semantic input").unwrap();
    let started = Instant::now();
    let scan = scan_tree(&fixture.project.root, &[]).unwrap();
    let second = scan_tree(&fixture.project.root, &[]).unwrap();
    assert_eq!(scan.entries.len(), 10002);
    assert_eq!(scan.files.len(), 5001);
    assert_eq!(scan.entries, second.entries);
    assert!(scan.files.iter().any(|file| file.path == "Density/malformed.json"), "malformed semantic files remain visible for parser diagnostics");
    assert!(!scan.files.iter().any(|file| file.path == "unknown.txt"));
    assert_eq!(scan.semantic_files.len(), scan.files.len());
    println!("Track 10 large fixture: {} inventory files, {} semantic inputs, two scans in {:?}", scan.entries.len(), scan.files.len(), started.elapsed());
}
