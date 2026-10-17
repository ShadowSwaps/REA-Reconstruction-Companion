// Trusted local fixture driver. JSON-lines transport is not an input sandbox.
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
if (!['reference', 'candidate'].includes(target)) throw new Error('Choose reference or candidate');
const { createStore } = await import('./' + target + '.mjs');
const store = createStore({ file: process.argv[3] ? path.resolve(process.argv[3]) : undefined });
for await (const line of readline.createInterface({ input: process.stdin })) {
  let response;
  try {
    const request = JSON.parse(line);
    if (request.op === 'state') response = { ok: true, rows: store.state() };
    else if (request.op === 'export') response = { ok: true, hex: store.exportBytes(request.version).toString('hex') };
    else if (request.op === 'import') {
      if (typeof request.hex !== 'string' || request.hex.length > 16384) throw Object.assign(new Error(), { code: 'size' });
      if (!/^(?:[0-9a-fA-F]{2})*$/.test(request.hex)) throw Object.assign(new Error(), { code: 'encoding' });
      response = { ok: true, rows: store.importBytes(Buffer.from(request.hex, 'hex')) };
    } else throw Object.assign(new Error(), { code: 'request' });
  } catch (error) { response = { ok: false, error: error.code ?? 'request' }; }
  console.log(JSON.stringify(response));
}
