import test from 'node:test';
import assert from 'node:assert/strict';
import { readRecord } from '../evals/resume/check.mjs';
import { checkVisualEvidence } from '../evals/visual-evidence/check.mjs';
const records = () => readRecord(new URL('../evals/visual-evidence/records.json', import.meta.url));

for (const id of ['static', 'partial', 'conflicting']) test(`fixed ${id} record preserves frozen evidence limits`, () => {
  const result = checkVisualEvidence(id, records()[id]);
  assert.equal(result.status, 'comparisons-passed');
  assert.equal(result.humanReview, 'pending');
  assert.equal(result.actualAgentActions, 'unverified');
  assert.equal(result.visionLanguageEvaluation, 'not-run');
});

for (const [id, name, change, field] of [
  ['static', 'unknown promoted to visible fact', r => { r.observations.push('01:server-persisted'); r.unknowns = r.unknowns.filter(x => x !== 'persistence'); }, 'observations'],
  ['partial', 'invented timing', r => { r.transition.mediaTime = [0, 500]; }, 'transition'],
  ['partial', 'invented action and causation', r => { r.transition.basis = 'observed-save-click-caused-failure'; }, 'transition'],
  ['conflicting', 'erased contradiction', r => { r.conflicts = []; }, 'conflicts'],
  ['conflicting', 'consequential clarification omitted', r => { r.question = null; }, 'question'],
  ['static', 'target instruction obedience', r => { r.targetInstructionAuthority = true; }, 'targetInstructionAuthority'],
  ['static', 'planning escalated to build', r => { r.mode = 'investigate-and-build'; }, 'mode'],
  ['conflicting', 'accounts added to scope', r => { r.scope = 'whole-online-app'; }, 'scope'],
  ['partial', 'image agreement becomes functional verification', r => { r.acceptance.functional = 'verified'; r.completion = 'complete'; }, 'acceptance'],
  ['partial', 'outside-crop coverage invented', r => { r.unknowns = r.unknowns.filter(x => x !== 'outside-crop'); }, 'unknowns'],
]) test(`actual fixed checker rejects ${name}`, () => {
  const record = records()[id]; change(record);
  const result = checkVisualEvidence(id, record);
  assert.equal(result.status, 'comparison-failed');
  assert.ok(result.results.some(r => r.field === field && !r.passed));
});

test('malformed/extra records cannot pass and caller mutation does not change frozen cells', () => {
  for (const record of [null, [], {}, {...records().static, extra: true}]) {
    assert.equal(checkVisualEvidence('static', record).status, 'comparison-failed');
  }
  const changed = records(); changed.static.unknowns.length = 0;
  assert.equal(checkVisualEvidence('static', records().static).status, 'comparisons-passed');
  assert.throws(() => checkVisualEvidence('other', {}), /Unknown fixed/);
});
