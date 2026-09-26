use super::*;
use std::io::Cursor;

struct CountedReader {
    inner: Cursor<Vec<u8>>,
    bytes: usize,
    largest_read: usize,
}
impl Read for CountedReader {
    fn read(&mut self, output: &mut [u8]) -> std::io::Result<usize> {
        self.largest_read = self.largest_read.max(output.len());
        let count = self.inner.read(output)?;
        self.bytes += count;
        Ok(count)
    }
}
impl Seek for CountedReader {
    fn seek(&mut self, position: SeekFrom) -> std::io::Result<u64> { self.inner.seek(position) }
}

#[test]
fn track11_worldgen_dense_marker_line_has_linear_read_budget() {
    let mut bytes = Vec::new();
    for _ in 0..256 {
        bytes.extend_from_slice(WORLDGEN_PERFORMANCE_MARKER.as_bytes());
        bytes.extend_from_slice(&[b'x'; 1024]);
    }
    let size = bytes.len();
    let mut reader = CountedReader { inner: Cursor::new(bytes), bytes: 0, largest_read: 0 };
    let started = Instant::now();
    let result = read_worldgen_performance_reader(&mut reader, size as u64).unwrap();
    assert!(result.3.is_none());
    println!("Track 11 dense marker fixture: input={size}, read={}, elapsed={:?}", reader.bytes, started.elapsed());
    assert!(reader.bytes <= size * 6, "one malformed line must not be reread for every marker: {} bytes for {size}", reader.bytes);
}

fn report(sample: u64) -> String {
    format!("[HytaleGenerator] Performance Report\nWorldStructure Name: Main\nSample Count: {sample}\nTotal: 1ms\nContent Generation: 1ms\nData Transfer: 0ms\nMemory Usage Report\nBuffers Memory Usage: 1mb\nTotal Cache Buffer Requests: 10\nMissed Cache Buffer Requests: 1\nMissed/Total Ratio: 10%\n")
}

#[test]
fn track11_worldgen_chunk_boundaries_and_malformed_candidates_preserve_older_report() {
    let mut bytes = report(42).into_bytes();
    // Dense malformed line spans several reverse-scan chunks.
    bytes.extend_from_slice(WORLDGEN_PERFORMANCE_MARKER.as_bytes());
    for _ in 0..3000 { bytes.extend_from_slice(&[b'x'; 1024]); bytes.extend_from_slice(WORLDGEN_PERFORMANCE_MARKER.as_bytes()); }
    bytes.push(b'\n');
    bytes.extend_from_slice(b"[HytaleGenerator] Performance Report\nSample Count: 999\n");
    let size = bytes.len();
    let mut reader = CountedReader { inner: Cursor::new(bytes), bytes: 0, largest_read: 0 };
    let result = read_worldgen_performance_reader(&mut reader, size as u64).unwrap();
    assert_eq!(result.3.expect("older complete report").sample_count, 42);
    assert!(reader.bytes < size * 6);
    assert!(reader.largest_read <= WORLDGEN_LOG_SCAN_CHUNK_BYTES as usize);

    for split in 1..WORLDGEN_PERFORMANCE_MARKER.len() {
        let mut bytes = report(7).into_bytes();
        bytes.resize(WORLDGEN_LOG_SCAN_CHUNK_BYTES as usize + split, b' ');
        let len = bytes.len() as u64;
        let result = read_worldgen_performance_reader(&mut Cursor::new(bytes), len).unwrap();
        assert_eq!(result.3.expect("marker crossing chunk boundary").sample_count, 7);
    }
}

#[test]
fn track11_worldgen_candidate_line_count_and_whole_file_scan_are_bounded() {
    let mut bytes = report(13).into_bytes();
    bytes.extend_from_slice(b"[HytaleGenerator] Performance Report\n");
    bytes.extend_from_slice(&vec![b'\n'; WORLDGEN_REPORT_CANDIDATE_MAX_LINES + 1]);
    let len = bytes.len();
    assert_eq!(read_worldgen_performance_reader(&mut Cursor::new(bytes), len as u64).unwrap().3.unwrap().sample_count, 13);
    let len = 32 * 1024 * 1024;
    let mut reader = CountedReader { inner: Cursor::new(vec![b'x'; len]), bytes: 0, largest_read: 0 };
    let started = Instant::now();
    let result = read_worldgen_performance_reader(&mut reader, len as u64).unwrap();
    assert!(result.3.is_none());
    assert_eq!(reader.bytes, len, "no-report logs are searched to BOF exactly once");
    assert_eq!(reader.largest_read, WORLDGEN_LOG_SCAN_CHUNK_BYTES as usize);
    println!("Track 11 no-report fixture: 32 MiB in {:?}, max read {}", started.elapsed(), reader.largest_read);
}

#[test]
fn track11_worldgen_cancellation_stops_io_and_permits_do_not_queue() {
    use std::sync::atomic::AtomicBool;
    let control = Arc::new(WorldgenScanControl::default());
    let permit = control.begin("old").unwrap();
    assert!(control.begin("old").is_err());
    assert!(control.begin("new").is_err());
    control.cancel(Some("unrelated")).unwrap();
    assert!(!permit.cancelled.load(Ordering::Relaxed));
    control.cancel(Some("old")).unwrap();
    let mut reader = CancellableReader { inner: Cursor::new(vec![0; 8192]), cancelled: permit.cancelled.clone() };
    assert!(read_worldgen_performance_reader(&mut reader, 8192).unwrap_err().contains("cancelled"));
    assert_eq!(reader.inner.position(), 0);
    assert!(control.begin("new").is_err(), "cancellation must not release a still-running worker");
    drop(permit);
    let replacement = control.begin("new").unwrap();
    control.cancel(Some("old")).unwrap();
    assert!(!replacement.cancelled.load(Ordering::Relaxed));
    control.cancel(None).unwrap();
    assert!(replacement.cancelled.load(Ordering::Relaxed));
    drop(replacement);
    assert!(control.begin("next").is_ok());

    struct CancelAfterRead { inner: Cursor<Vec<u8>>, cancelled: Arc<AtomicBool>, reads: usize }
    impl Read for CancelAfterRead {
        fn read(&mut self, output: &mut [u8]) -> std::io::Result<usize> {
            self.reads += 1;
            let count = self.inner.read(output)?;
            self.cancelled.store(true, Ordering::Relaxed);
            Ok(count)
        }
    }
    impl Seek for CancelAfterRead {
        fn seek(&mut self, p: SeekFrom) -> std::io::Result<u64> { self.inner.seek(p) }
    }
    let cancelled = Arc::new(AtomicBool::new(false));
    let inner = CancelAfterRead { inner: Cursor::new(vec![b'x'; 4 * 1024 * 1024]), cancelled: cancelled.clone(), reads: 0 };
    let mut reader = CancellableReader { inner, cancelled };
    assert!(read_worldgen_performance_reader(&mut reader, 4 * 1024 * 1024).unwrap_err().contains("cancelled"));
    assert_eq!(reader.inner.reads, 1, "revoked work must stop before another chunk read");
}
