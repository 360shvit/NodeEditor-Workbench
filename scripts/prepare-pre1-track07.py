from pathlib import Path
import json

rust_path = Path('src-tauri/src/main.rs')
rust = rust_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


old = '''fn active_project(state: &State<'_, DesktopState>) -> Result<ProjectState, String> {
    state.project.lock().map_err(|_| "Project state lock is poisoned.".to_string())?.clone()
        .ok_or_else(|| "No project is currently open.".to_string())
}
'''
new = '''fn revalidate_authorized_directory(path: &Path, expected_canonical: &Path, label: &str) -> Result<(), String> {
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
'''
rust = replace_once(rust, old, new, 'active-project grant revalidation')

old = ''') -> Result<ProjectScan, String> {
    discovery_roots.retain(|raw| safe_relative(raw).is_ok());
'''
new = ''') -> Result<ProjectScan, String> {
    revalidate_authorized_directory(&project.root, &project.canonical_root, "Active project root")?;
    discovery_roots.retain(|raw| safe_relative(raw).is_ok());
'''
rust = replace_once(rust, old, new, 'discovery-root grant revalidation')

old = '''        if metadata.file_type().is_symlink() || metadata.is_dir() {
            return Err(format!("Unsafe output target: {}", target.display()));
        }
    }
    Ok(target)
}

fn output_root'''
new = '''        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || metadata.is_dir() {
            return Err(format!("Unsafe output target: {}", target.display()));
        }
        let canonical = fs::canonicalize(&target).map_err(|error| io_error("Cannot canonicalize output target", error))?;
        if !canonical.starts_with(root) {
            return Err(format!("Output path escaped the selected output root: {raw}"));
        }
    }
    Ok(target)
}

fn output_root'''
rust = replace_once(rust, old, new, 'existing output target containment')

old = '''fn output_root(state: &State<'_, DesktopState>, token: &str) -> Result<PathBuf, String> {
    state.output_roots.lock().map_err(|_| "Output state lock is poisoned.".to_string())?.get(token).cloned()
        .ok_or_else(|| "The selected output folder is no longer registered.".to_string())
}
'''
new = '''fn output_root(state: &State<'_, DesktopState>, token: &str) -> Result<PathBuf, String> {
    let root = state.output_roots.lock().map_err(|_| "Output state lock is poisoned.".to_string())?.get(token).cloned()
        .ok_or_else(|| "The selected output folder is no longer registered.".to_string())?;
    revalidate_authorized_directory(&root, &root, "Selected output folder")?;
    Ok(root)
}
'''
rust = replace_once(rust, old, new, 'output token grant revalidation')

old = '''fn select_worldgen_log_from_folder(folder: &Path) -> Result<PathBuf, String> {
    let mut newest: Option<(std::time::SystemTime, String, PathBuf)> = None;
'''
new = '''fn select_worldgen_log_from_folder(folder: &Path) -> Result<PathBuf, String> {
    let canonical_folder = fs::canonicalize(folder)
        .map_err(|error| io_error("Cannot canonicalize selected WorldGen log folder", error))?;
    if !canonical_folder.is_dir() {
        return Err("Selected WorldGen log folder is no longer a directory.".to_string());
    }
    let mut newest: Option<(std::time::SystemTime, String, PathBuf)> = None;
'''
rust = replace_once(rust, old, new, 'WorldGen folder canonical base')

old = '''    let metadata = fs::symlink_metadata(&selected).map_err(|error| io_error("Cannot inspect resolved WorldGen log", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Resolved WorldGen log must be a regular local file.".to_string());
    }
    fs::canonicalize(selected).map_err(|error| io_error("Cannot canonicalize resolved WorldGen log", error))
}
'''
new = '''    let metadata = fs::symlink_metadata(&selected).map_err(|error| io_error("Cannot inspect resolved WorldGen log", error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
        return Err("Resolved WorldGen log must be a regular local file.".to_string());
    }
    let canonical = fs::canonicalize(selected).map_err(|error| io_error("Cannot canonicalize resolved WorldGen log", error))?;
    if !canonical.starts_with(&canonical_folder) {
        return Err("Resolved WorldGen log escaped the selected log folder; choose the folder again.".to_string());
    }
    Ok(canonical)
}
'''
rust = replace_once(rust, old, new, 'WorldGen resolved-file containment')

old = '''    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Selected WorldGen log must be a regular local file, not a symlink, junction or directory.".to_string());
    }
'''
new = '''    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
        return Err("Selected WorldGen log must be a regular local file, not a symlink, junction or directory.".to_string());
    }
'''
rust = replace_once(rust, old, new, 'WorldGen file picker reparse rejection')

old = '''    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("Selected WorldGen log folder must be a regular local directory, not a symlink or junction.".to_string());
    }
'''
new = '''    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_dir() {
        return Err("Selected WorldGen log folder must be a regular local directory, not a symlink or junction.".to_string());
    }
'''
rust = replace_once(rust, old, new, 'WorldGen folder picker reparse rejection')

old = '''    let path = match source {
        WorldgenLogSource::File(path) => path,
        WorldgenLogSource::Folder(folder) => select_worldgen_log_from_folder(&folder)?
    };
    let metadata = fs::symlink_metadata(&path).map_err(|error| io_error("Cannot inspect selected WorldGen log", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
'''
new = '''    let path = match source {
        WorldgenLogSource::File(path) => path,
        WorldgenLogSource::Folder(folder) => {
            revalidate_authorized_directory(&folder, &folder, "Selected WorldGen log folder")?;
            select_worldgen_log_from_folder(&folder)?
        }
    };
    let metadata = fs::symlink_metadata(&path).map_err(|error| io_error("Cannot inspect selected WorldGen log", error))?;
    if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
'''
rust = replace_once(rust, old, new, 'WorldGen token-use revalidation')

marker = '''    #[test]
    fn project_scan_rejects_external_junction_and_reports_reparse() {'''
tests = r'''    #[test]
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

''' + marker
rust = replace_once(rust, marker, tests, 'Windows authority fixtures')

rust_path.write_text(rust, encoding='utf-8', newline='')

pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['scripts']['test:pre1-native-authority-boundary'] = 'node scripts/test-pre1-native-authority-boundary.mjs'
pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='')
