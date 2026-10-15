// Restricted reader for this project's release builder, not a general ZIP tool.
import { inflateRawSync } from 'node:zlib';
import crypto from 'node:crypto';

export const MAX_ARCHIVE = 16 * 1024 * 1024;
const MAX_EXPANDED = 64 * 1024 * 1024;
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function requireThat(ok, message) { if (!ok) throw new Error(`Invalid release archive: ${message}`); }

export function releaseFiles(zip, version, expectedHash) {
  requireThat(Buffer.isBuffer(zip) && zip.length >= 22 && zip.length <= MAX_ARCHIVE, 'size');
  requireThat(digest(zip) === expectedHash, 'SHA-256 mismatch');
  // Our builder emits no ZIP comments, encryption, descriptors, ZIP64 or directories.
  const end = zip.length - 22;
  requireThat(zip.readUInt32LE(end) === 0x06054b50, 'end record');
  const count = zip.readUInt16LE(end + 10), size = zip.readUInt32LE(end + 12), start = zip.readUInt32LE(end + 16);
  requireThat(zip.readUInt32LE(end + 4) === 0 && zip.readUInt16LE(end + 8) === count && zip.readUInt16LE(end + 20) === 0, 'split ZIP or comment');
  requireThat(count > 0 && count <= 1000 && start + size === end, 'directory bounds');
  const prefix = `REA-Reconstruction-Companion-${version}/`;
  const files = new Map(), seen = new Set(), ranges = [];
  let cursor = start, expanded = 0;
  for (let i = 0; i < count; i++) {
    requireThat(cursor + 46 <= end && zip.readUInt32LE(cursor) === 0x02014b50, 'directory entry');
    const flags = zip.readUInt16LE(cursor + 8), method = zip.readUInt16LE(cursor + 10);
    const compressed = zip.readUInt32LE(cursor + 20), length = zip.readUInt32LE(cursor + 24);
    const names = zip.readUInt16LE(cursor + 28), extra = zip.readUInt16LE(cursor + 30), comment = zip.readUInt16LE(cursor + 32);
    const mode = zip.readUInt32LE(cursor + 38) >>> 16, local = zip.readUInt32LE(cursor + 42);
    requireThat(cursor + 46 + names + extra + comment <= end && names > 0, 'name bounds');
    const name = zip.subarray(cursor + 46, cursor + 46 + names).toString('utf8');
    requireThat(Buffer.from(name).equals(zip.subarray(cursor + 46, cursor + 46 + names)), 'name encoding');
    requireThat(name.startsWith(prefix), 'root');
    const relative = name.slice(prefix.length), parts = relative.split('/');
    requireThat(parts.every(p => /^[A-Za-z0-9_.-]+$/.test(p) && p !== '.' && p !== '..' && !p.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)), 'unsafe path');
    const folded = relative.toLowerCase();
    requireThat(!seen.has(folded), 'duplicate path'); seen.add(folded);
    requireThat((mode & 0xf000) === 0x8000 && zip.readUInt16LE(cursor + 34) === 0 && (flags & ~0x800) === 0 && [0, 8].includes(method), 'unsupported entry type');
    expanded += length;
    requireThat(length <= MAX_ARCHIVE && expanded <= MAX_EXPANDED, 'expanded size');
    requireThat(local + 30 <= start && zip.readUInt32LE(local) === 0x04034b50, 'local header');
    const localNames = zip.readUInt16LE(local + 26), localExtra = zip.readUInt16LE(local + 28);
    const dataStart = local + 30 + localNames + localExtra, dataEnd = dataStart + compressed;
    requireThat(dataEnd <= start && localNames === names && zip.subarray(local + 30, local + 30 + localNames).equals(Buffer.from(name)), 'local bounds/name');
    requireThat(zip.readUInt16LE(local + 6) === flags && zip.readUInt16LE(local + 8) === method && zip.readUInt32LE(local + 18) === compressed && zip.readUInt32LE(local + 22) === length && zip.readUInt32LE(local + 14) === zip.readUInt32LE(cursor + 16), 'local metadata');
    ranges.push([local, dataEnd]);
    const packed = zip.subarray(dataStart, dataEnd);
    const data = method === 0 ? Buffer.from(packed) : inflateRawSync(packed, { maxOutputLength: Math.max(1, length) });
    requireThat(data.length === length, 'content length');
    files.set(relative, data);
    cursor += 46 + names + extra + comment;
  }
  requireThat(cursor === end, 'directory size');
  ranges.sort((a, b) => a[0] - b[0]);
  requireThat(ranges.every((r, i) => r[0] === (i ? ranges[i - 1][1] : 0)) && ranges.at(-1)[1] === start, 'overlapping or unaccounted data');
  requireThat(files.has('manifest.json'), 'missing manifest');
  const manifest = JSON.parse(files.get('manifest.json').toString('utf8'));
  requireThat(manifest.name === 'rea-reconstruction-companion' && manifest.version === version && manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files), 'manifest identity');
  requireThat(Object.keys(manifest.files).length === files.size - 1, 'undeclared files');
  for (const [p, sha] of Object.entries(manifest.files)) requireThat(p !== 'manifest.json' && files.has(p) && /^[a-f0-9]{64}$/.test(sha) && digest(files.get(p)) === sha, `manifest hash: ${p}`);
  requireThat(files.has('package.json'), 'missing package metadata');
  const pkg = JSON.parse(files.get('package.json').toString('utf8'));
  requireThat(pkg.name === manifest.name && pkg.version === version && pkg.type === 'module', 'package identity');
  const engine = /^>=([1-9]\d*)$/.exec(pkg.engines?.node || '');
  requireThat(engine && Number(process.versions.node.split('.')[0]) >= Number(engine[1]), 'unsupported Node requirement; update manually');
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) requireThat(!pkg[field] || Object.keys(pkg[field]).length === 0, 'new dependency requirements; review manually');
  return files;
}
