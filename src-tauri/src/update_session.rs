use std::sync::Mutex;

struct Session<T> {
    generation: u64,
    selected: Option<T>,
    installing: bool,
}

pub struct UpdateSession<T> { state: Mutex<Session<T>> }

impl<T> Default for UpdateSession<T> {
    fn default() -> Self {
        Self { state: Mutex::new(Session { generation: 0, selected: None, installing: false }) }
    }
}

impl<T: Clone> UpdateSession<T> {
    pub fn begin_check(&self) -> Result<u64, String> {
        let mut state = self.state.lock().map_err(|_| "Pending update state is unavailable.")?;
        if state.installing { return Err("An update installation is already in progress.".into()); }
        state.selected = None; // A failed/cancelled request cannot leave an older offer installable.
        state.generation = state.generation.checked_add(1).ok_or("Update request generation exhausted.")?;
        Ok(state.generation)
    }

    pub fn finish_check(&self, generation: u64, selected: Option<T>) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|_| "Pending update state is unavailable.")?;
        if state.generation != generation || state.installing {
            return Err("This update check was superseded. Check for updates again.".into());
        }
        state.selected = selected;
        Ok(())
    }

    pub fn begin_install(&self, validate: impl FnOnce(&T) -> Result<(), String>) -> Result<InstallLease<'_, T>, String> {
        let mut state = self.state.lock().map_err(|_| "Pending update state is unavailable.")?;
        if state.installing { return Err("An update installation is already in progress.".into()); }
        let selected = state.selected.as_ref().ok_or("No checked update is ready to install. Check for updates again.")?;
        validate(selected)?;
        let selected = selected.clone();
        state.installing = true;
        Ok(InstallLease { session: self, selected })
    }
}

// Holds no mutex across download/await. Drop releases exclusivity on every error/cancellation path.
pub struct InstallLease<'a, T> { session: &'a UpdateSession<T>, pub selected: T }
impl<T> Drop for InstallLease<'_, T> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.session.state.lock() { state.installing = false; }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn track14_failed_recheck_revokes_old_offer() {
        let session = UpdateSession::default();
        let first = session.begin_check().unwrap();
        session.finish_check(first, Some("old")).unwrap();
        session.begin_check().unwrap(); // Network failure: no finish_check.
        assert!(session.begin_install(|_| Ok(())).is_err());
    }

    #[test]
    fn track14_out_of_order_check_cannot_replace_newer_offer() {
        let session = UpdateSession::default();
        let old = session.begin_check().unwrap();
        let new = session.begin_check().unwrap();
        session.finish_check(new, Some("new")).unwrap();
        assert!(session.finish_check(old, Some("old")).is_err());
        assert!(session.finish_check(old, None).is_err());
        assert_eq!(session.begin_install(|_| Ok(())).unwrap().selected, "new");
    }

    #[test]
    fn track14_install_is_exclusive_and_failure_releases_lease() {
        let session = UpdateSession::default();
        session.finish_check(session.begin_check().unwrap(), Some("signed-offer")).unwrap();
        assert!(session.begin_install(|_| Err("wrong channel/version".into())).is_err());
        let lease = session.begin_install(|_| Ok(())).unwrap();
        assert!(session.begin_check().is_err());
        assert!(session.begin_install(|_| Ok(())).is_err());
        drop(lease); // Covers download/signature/staged-change/installation failure or cancelled future.
        assert!(session.begin_install(|_| Ok(())).is_ok());
        assert!(session.begin_check().is_ok());
    }
}
