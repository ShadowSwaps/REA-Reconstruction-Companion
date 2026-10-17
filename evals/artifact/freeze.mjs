import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const root = path.dirname(fileURLToPath(import.meta.url));
export const hash = data => createHash('sha256').update(data).digest('hex');
export const read = name => fs.readFileSync(path.join(root, name));
export const locked = Object.freeze({
  // Historical pre-candidate capture, not a requirement that fresh hosts match it.
  'observed-reference.json': '93d7e7b8a036b6b7626b6e676618f446dae0f7b08e0107ebea2f0e7d7aa070fc',
  'reference/Parcel.exe': '6f4e7e1d49e03f60adf9deb4929aafbe3fdd6babb628881807c63efb3ee089b4',
  'corpus.json': 'cec3c120b8e39a8025af07d6f52ee705b075d7887c6b4d4f507b5d0a28542c26',
  'build-source/Parcel.cs': '328018920a729784b96753283fddb253a6b1978256a49ee57fc8ec9f8a34cf77',
  'build-source/legacy-note.txt': '61f6a443e10532dba0eeb06958b8cd5432cd60c6f4993c8506688993f8a18797'
});
export function verifyFreeze(directory = root) {
  for (const [name, expected] of Object.entries(locked)) {
    if (hash(fs.readFileSync(path.join(directory, name))) !== expected) throw new Error('Frozen bytes changed: ' + name);
  }
  const identity = JSON.parse(fs.readFileSync(path.join(directory, 'identity.json')));
  if (identity.artifact.sha256 !== locked['reference/Parcel.exe'] || identity.corpusSha256 !== locked['corpus.json']) throw new Error('Identity mismatch');
  return JSON.parse(fs.readFileSync(path.join(directory, 'corpus.json'))).cases;
}
