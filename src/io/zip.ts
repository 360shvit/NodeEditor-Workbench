export interface ZipEntryInput {
  path: string;
  data: Blob | string | Uint8Array;
}

const textEncoder = new TextEncoder();

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
  const year = Math.max(1980, date.getFullYear());
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
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Creates a standards-compliant ZIP using the STORE method (no compression).
 * No dependency is required and binary project assets are preserved byte-for-byte.
 */
export async function createZipBlob(entries: ZipEntryInput[]): Promise<Blob> {
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const entry of entries) {
    const normalizedPath = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalizedPath || normalizedPath.includes('../')) throw new Error(`Unsafe ZIP path: ${entry.path}`);
    const name = textEncoder.encode(normalizedPath);
    const content = await toBytes(entry.data);
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

    offset += local.bytes.byteLength + name.byteLength + content.byteLength;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + (part instanceof Uint8Array ? part.byteLength : 0), 0);
  const end = view(22);
  end.data.setUint32(0, 0x06054b50, true);
  end.data.setUint16(4, 0, true);
  end.data.setUint16(6, 0, true);
  end.data.setUint16(8, entries.length, true);
  end.data.setUint16(10, entries.length, true);
  end.data.setUint32(12, centralSize, true);
  end.data.setUint32(16, offset, true);
  end.data.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end.bytes], { type: 'application/zip' });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
