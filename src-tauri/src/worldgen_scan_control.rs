use std::{io::{self, Read, Seek, SeekFrom}, sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}}};

/// One native scan at a time. Revocation signals the active reader; the permit
/// remains occupied until its blocking work has actually returned.
#[derive(Default)]
pub(crate) struct WorldgenScanControl {
    active: Mutex<Option<(String, Arc<AtomicBool>)>>,
}

impl WorldgenScanControl {
    pub(crate) fn begin(self: &Arc<Self>, token: &str) -> Result<WorldgenScanPermit, String> {
        let mut active = self.active.lock().map_err(|_| "WorldGen scan lock is poisoned.".to_string())?;
        if active.is_some() { return Err("A WorldGen scan is still finishing. Retry Refresh now shortly.".to_string()); }
        let cancelled = Arc::new(AtomicBool::new(false));
        *active = Some((token.to_owned(), cancelled.clone()));
        Ok(WorldgenScanPermit { owner: self.clone(), cancelled })
    }

    pub(crate) fn cancel(&self, token: Option<&str>) -> Result<(), String> {
        let active = self.active.lock().map_err(|_| "WorldGen scan lock is poisoned.".to_string())?;
        if let Some((current, cancelled)) = active.as_ref() {
            if token.map_or(true, |value| value == current) { cancelled.store(true, Ordering::Relaxed); }
        }
        Ok(())
    }
}

pub(crate) struct WorldgenScanPermit {
    owner: Arc<WorldgenScanControl>,
    pub(crate) cancelled: Arc<AtomicBool>,
}

impl Drop for WorldgenScanPermit {
    fn drop(&mut self) {
        if let Ok(mut active) = self.owner.active.lock() { *active = None; }
    }
}

pub(crate) struct CancellableReader<R> {
    pub(crate) inner: R,
    pub(crate) cancelled: Arc<AtomicBool>,
}

impl<R> CancellableReader<R> {
    fn check(&self) -> io::Result<()> {
        if self.cancelled.load(Ordering::Relaxed) {
            // Interrupted is retried by read_exact/read_line, so use Other.
            Err(io::Error::new(io::ErrorKind::Other, "WorldGen scan cancelled."))
        } else { Ok(()) }
    }
}

impl<R: Read> Read for CancellableReader<R> {
    fn read(&mut self, output: &mut [u8]) -> io::Result<usize> {
        self.check()?;
        self.inner.read(output)
    }
}

impl<R: Seek> Seek for CancellableReader<R> {
    fn seek(&mut self, position: SeekFrom) -> io::Result<u64> {
        self.check()?;
        self.inner.seek(position)
    }
}
