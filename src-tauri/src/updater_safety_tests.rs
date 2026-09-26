use super::*;

#[test]
fn track14_channel_and_immutable_download_authority() {
    let repository = "example/workbench";
    let url = |version: &str| format!("https://github.com/{repository}/releases/download/v{version}/Hytale-Generator-Workbench_{version}_x64-setup.exe");
    assert!(validate_update_target("stable", "1.2.3", &url("1.2.3"), repository).is_ok());
    assert!(validate_update_target("stable", "1.2.3+build-one", &url("1.2.3+build-one"), repository).is_ok());
    assert!(validate_update_target("stable", "1.2.3-rc.1", &url("1.2.3-rc.1"), repository).is_err());
    assert!(validate_update_target("preview", "1.2.3-rc.1", &url("1.2.3-rc.1"), repository).is_ok());
    assert!(validate_update_target("other", "1.2.3", &url("1.2.3"), repository).is_err());
    for bad in [url("1.2.2"), url("1.2.3").replace("https:", "http:"), url("1.2.3").replace(repository, "other/repo"), format!("{}?redirect=1", url("1.2.3")), "https://example.test/installer.exe".into()] {
        assert!(validate_update_target("preview", "1.2.3", &bad, repository).is_err(), "{bad}");
    }
}

#[test]
fn track14_install_boundary_excludes_project_transactions() {
    let desktop = DesktopState::default();
    let apply = desktop.apply_transaction_lock.lock().unwrap();
    assert!(lock_update_install(&desktop).is_err(), "active Apply must prevent installer launch/restart");
    drop(apply);
    let install = lock_update_install(&desktop).unwrap();
    assert!(desktop.apply_transaction_lock.try_lock().is_err(), "transaction cannot start across install boundary");
    drop(install);
    assert!(desktop.apply_transaction_lock.try_lock().is_ok());
}
