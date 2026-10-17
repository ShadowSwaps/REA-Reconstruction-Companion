import { fileURLToPath } from 'node:url';
import { emit, preflight, summarize } from './fixture-environment.mjs';
import { runTests } from './suite-process.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => !['--help', '--preflight-only', '--run-tests'].includes(arg))) {
  console.error('Usage: node scripts/run-checks.mjs [--help|--preflight-only|--run-tests]');
  process.exitCode = 2;
} else if (args.includes('--help')) {
  console.log('Usage: node scripts/run-checks.mjs [--preflight-only|--run-tests]\nDefault: bounded fixture probe, then unchanged Node suite if supported.\n--preflight-only: observation only; required validation remains incomplete (exit 2).\n--run-tests: run unchanged suite even if probe fails; retain failures.\nExit 0: completed validation; child failure: original exit; otherwise 2: incomplete.');
} else {
  const probe = preflight();
  emit(probe);
  const finish = result => {
    emit(result);
    if (result.exit !== 0) console.error('Required validation has not passed. Preserve original errors/counts; a denied probe does not explain other failures. Use the unchanged suite in a supported local context or existing authorized public PR CI. Do not repeat a known blocked full run without a relevant changed condition. See CONTRIBUTING.md.');
    process.exitCode = result.exit;
  };
  if (args.includes('--preflight-only') || (!probe.complete && !args.includes('--run-tests'))) finish(summarize(probe, null, null));
  else finish(await runTests(probe, { cwd: fileURLToPath(new URL('../', import.meta.url)) }));
}
