type Channel = 'stable' | 'preview';

export function readUpdateChannel(fallback: Channel): Channel {
  try {
    const stored = globalThis.localStorage?.getItem('hgw.update-channel');
    return stored === 'stable' || stored === 'preview' ? stored : fallback;
  } catch { return fallback; }
}

export function persistUpdateChannel(channel: Channel): void {
  try { globalThis.localStorage?.setItem('hgw.update-channel', channel); } catch {
    // The selected in-memory channel remains usable when optional storage fails.
  }
}
