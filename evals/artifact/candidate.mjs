import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Implemented after the recorded artifact contract and reference observations.
export function evaluate(args) {
  const fail = name => ({ out: '', err: `E:${name}\n`, exit: 2 });
  if (args.length !== 2 || !['key', 'fee', 'check'].includes(args[0])) return fail('usage');
  const [command, value] = args;
  let result;
  if (command === 'key') {
    const key = value.replace(/^[ \t]+|[ \t]+$/g, '');
    if (!key.length || key.length > 8 || /[^A-Za-z0-9-]/.test(key)) return fail('key');
    result = 'KEY=' + key.toUpperCase();
  } else if (command === 'fee') {
    if (!value.length || value.length > 4 || /[^0-9]/.test(value) || (value.length > 1 && value[0] === '0') || Number(value) > 1000) return fail('fee');
    const n = Number(value);
    result = 'FEE=' + (n === 0 ? 0 : n <= 3 ? 5 : 5 + (n - 3) * 2);
  } else {
    if (value.length > 16 || value.length % 2 || /[^0-9A-Fa-f]/.test(value)) return fail('check');
    let sum = 0;
    for (let i = 0; i < value.length; i += 2) sum += Number.parseInt(value.slice(i, i + 2), 16);
    result = 'SUM=' + (sum % 256).toString(16).toUpperCase().padStart(2, '0');
  }
  return { out: result + '\n', err: '', exit: 0 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = evaluate(process.argv.slice(2));
  process.stdout.write(result.out); process.stderr.write(result.err); process.exitCode = result.exit;
}
