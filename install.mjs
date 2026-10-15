#!/usr/bin/env node
// Public installer entry point; the same implementation ships with the skill.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInstaller } from './skills/rea-reconstruction-companion/scripts/installer.mjs';
export * from './skills/rea-reconstruction-companion/scripts/installer.mjs';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runInstaller(process.argv.slice(2), path.dirname(fileURLToPath(import.meta.url)));
}
