import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const files = {};
function add(relative) {
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(absolute).sort()) {
      if (name === '__pycache__' || name.endsWith('.pyc')) continue;
      add(`${relative}/${name}`);
    }
  } else {
    files[relative] = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  }
}
for (const relative of ['README.md', 'INSTALL.md', 'LICENSE', 'CONTRIBUTING.md', 'package.json', 'install.mjs', '.gitignore', '.gitattributes', 'skills', 'adapters', 'integration', 'scripts', 'tests', '.github', 'assets']) add(relative);
const { name, version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ name, version, files }, null, 2) + '\n');
console.log(`Manifest: ${Object.keys(files).length} files, version ${version}`);
