import { desktopSaveZip, hasDesktopBridge } from './desktopBridge';

export interface ZipEntryInput {
  path: string;
  data: Blob | string | Uint8Array;
}

const textEncoder = new TextEncoder();
const ZIP32_SENTINEL = 0xffffffff;
const ZIP32_ENTRY_SENTINEL = 0xffff;
// This writer materializes the archive in the WebView. Larger copies use native folder output.
const MAX_ZIP_BYTES = 512 * 1024 * 1024;

/** Checked metadata arithmetic, independent of payload allocation. */
export function checkedZipLayout(offset: number, centralSize: number, nameBytes: number, size: number) {
  if ([offset, centralSize, nameBytes, size].some((value) => !Number.isSafeInteger(value) || value < 0)
    || nameBytes > 0xffff || size >= ZIP32_SENTINEL) {
    throw new Error('ZIP32 size/offset limit exceeded. Use folder output for this project.');
  }
  const nextOffset = offset + 30 + nameBytes + size;
  const nextCentralSize = centralSize + 46 + nameBytes;
  if (nextOffset >= ZIP32_SENTINEL || nextCentralSize >= ZIP32_SENTINEL) {
    throw new Error('ZIP32 size/offset limit exceeded. Use folder output for this project.');
  }
  if (nextOffset + nextCentralSize + 22 > MAX_ZIP_BYTES) {
    throw new Error('ZIP export exceeds the 512 MiB in-memory safety limit. Use folder output for this project.');
  }
  return { nextOffset, nextCentralSize };
}

function utf8Size(text: string): number {
  let size = 0;
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0x80) size += 1;
    else if (unit < 0x800) size += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) {
      size += 4;
      index += 1;
    } else size += 3; // TextEncoder replaces unpaired surrogates with U+FFFD.
    if (size > MAX_ZIP_BYTES) throw new Error('ZIP text exceeds the 512 MiB in-memory safety limit. Use folder output.');
  }
  return size;
}

function zipPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..'
    || /[\x00-\x1f<>:"|?*]/.test(segment) || /[. ]$/.test(segment)
    || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(segment))) {
    throw new Error(`Unsafe ZIP path: ${path}`);
  }
  return normalized;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate();
  return { time, date: day };
}

function view(size: number) {
  const bytes = new Uint8Array(size);
  return { bytes, data: new DataView(bytes.buffer) };
}

async function toBytes(data: ZipEntryInput['data']): Promise<Uint8Array> {
  if (typeof data === 'string') return textEncoder.encode(data);
  if (data instanceof Uint8Array) return data.slice();
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Creates a standards-compliant ZIP using the STORE method (no compression).
 * No dependency is required and binary project assets are preserved byte-for-byte.
 */
export async function createZipBlob(entries: Iterable<ZipEntryInput> | AsyncIterable<ZipEntryInput>): Promise<Blob> {
  if (Array.isArray(entries) && entries.length >= ZIP32_ENTRY_SENTINEL) {
    throw new Error('ZIP32 supports at most 65,534 entries without Zip64. Use folder output for this project.');
  }
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  const files = new Set<string>();
  const directories = new Set<string>();
  let offset = 0;
  let centralSize = 0;
  let count = 0;
  const stamp = dosDateTime();

  for await (const entry of entries) {
    if (++count >= ZIP32_ENTRY_SENTINEL) throw new Error('ZIP32 entry-count limit exceeded. Use folder output for this project.');
    const normalizedPath = zipPath(entry.path);
    const identity = normalizedPath.toLowerCase();
    if (files.has(identity) || directories.has(identity)) throw new Error(`Conflicting ZIP path: ${entry.path}`);
    const segments = identity.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      const parent = segments.slice(0, index).join('/');
      if (files.has(parent)) throw new Error(`Conflicting ZIP path: ${entry.path}`);
      directories.add(parent);
    }
    files.add(identity);
    if (normalizedPath.length > 0xffff) throw new Error('ZIP32 filename is too long.');
    const name = textEncoder.encode(normalizedPath);
    if (name.byteLength > 0xffff) throw new Error(`ZIP32 filename is longer than 65,535 UTF-8 bytes: ${entry.path}`);
    const size = typeof entry.data === 'string' ? utf8Size(entry.data)
      : entry.data instanceof Uint8Array ? entry.data.byteLength : entry.data.size;
    const { nextOffset, nextCentralSize } = checkedZipLayout(offset, centralSize, name.byteLength, size);
    const content = await toBytes(entry.data);
    if (content.byteLength !== size) throw new Error(`ZIP input size changed while reading: ${entry.path}`);
    const crc = crc32(content);

    const local = view(30);
    local.data.setUint32(0, 0x04034b50, true);
    local.data.setUint16(4, 20, true);
    local.data.setUint16(6, 0x0800, true); // UTF-8 names
    local.data.setUint16(8, 0, true); // STORE
    local.data.setUint16(10, stamp.time, true);
    local.data.setUint16(12, stamp.date, true);
    local.data.setUint32(14, crc, true);
    local.data.setUint32(18, content.byteLength, true);
    local.data.setUint32(22, content.byteLength, true);
    local.data.setUint16(26, name.byteLength, true);
    local.data.setUint16(28, 0, true);
    localParts.push(local.bytes, name, content);

    const central = view(46);
    central.data.setUint32(0, 0x02014b50, true);
    central.data.setUint16(4, 20, true);
    central.data.setUint16(6, 20, true);
    central.data.setUint16(8, 0x0800, true);
    central.data.setUint16(10, 0, true);
    central.data.setUint16(12, stamp.time, true);
    central.data.setUint16(14, stamp.date, true);
    central.data.setUint32(16, crc, true);
    central.data.setUint32(20, content.byteLength, true);
    central.data.setUint32(24, content.byteLength, true);
    central.data.setUint16(28, name.byteLength, true);
    central.data.setUint16(30, 0, true);
    central.data.setUint16(32, 0, true);
    central.data.setUint16(34, 0, true);
    central.data.setUint16(36, 0, true);
    central.data.setUint32(38, 0, true);
    central.data.setUint32(42, offset, true);
    centralParts.push(central.bytes, name);

    offset = nextOffset;
    centralSize = nextCentralSize;
  }

  const end = view(22);
  end.data.setUint32(0, 0x06054b50, true);
  end.data.setUint16(4, 0, true);
  end.data.setUint16(6, 0, true);
  end.data.setUint16(8, count, true);
  end.data.setUint16(10, count, true);
  end.data.setUint32(12, centralSize, true);
  end.data.setUint32(16, offset, true);
  end.data.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end.bytes], { type: 'application/zip' });
}

export async function downloadBlob(filename: string, blob: Blob): Promise<void> {
  if (hasDesktopBridge()) {
    await desktopSaveZip(filename, blob);
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
