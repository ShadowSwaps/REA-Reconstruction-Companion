import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCheck } from '../evals/check.mjs';
import { casesFor } from '../evals/oracles.mjs';

// Independent candidate implementations; the reviewer oracle contains literal
// snapshots, not outputs calculated by this implementation.
const candidate = improved => `export function evaluate(actions) {
  const improved = ${improved};
  const rows = [{id:'a',title:'Amber'},{id:'b',title:'Birch'},{id:'c',title:'Cedar'}];
  const pins = new Set();
  let query = '', order = 'asc', selectedIndex = null, selectedId = null;
  let visible = rows.map(row => row.id);
  return actions.map(action => {
    if (action.type === 'select') {
      if (improved) selectedId = visible[action.index];
      else selectedIndex = action.index;
    }
    if (action.type === 'clear') { selectedId = null; selectedIndex = null; }
    if (action.type === 'filter') query = action.text;
    if (action.type === 'sort') order = action.order;
    visible = rows.filter(row => row.title.toLowerCase().includes(query.toLowerCase())).map(row => row.id);
    if (order === 'desc') visible.reverse();
    if (improved && !visible.includes(selectedId)) selectedId = null;
    const selected = improved ? selectedId : (visible[selectedIndex] ?? null);
    if (action.type === 'pin' && selected !== null) {
      if (pins.has(selected)) pins.delete(selected); else pins.add(selected);
    }
    return {visible, selected, pinned: rows.filter(row => pins.has(row.id)).map(row => row.id)};
  });
}`;

function fixture(t, source) {
  const parent = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'rea-selection-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), parent);
    assert.ok(path.basename(directory).startsWith('rea-selection-test-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const file = path.join(directory, 'selection candidate.mjs');
  fs.writeFileSync(file, source);
  return file;
}

for (const [id, improved] of [['quirk-parity', false], ['quirk-improvement', true]]) {
  test(`${id}: correct behavior passes and human review remains pending`, t => {
    const report = runCheck(id, fixture(t, candidate(improved)));
    assert.equal(report.status, 'comparisons-passed', JSON.stringify(report));
    assert.equal(report.passed, casesFor(id).length);
    assert.equal(report.errored, 0);
    assert.equal(report.humanReview, 'pending');
  });
}

const mutants = [
  ['quirk-parity', 'silent bug fix breaks requested parity', candidate(true), 'sort-retarget'],
  ['quirk-improvement', 'faithful quirk violates approved improvement', candidate(false), 'sort-retarget'],
  ['quirk-improvement', 'selection lost on sorting', candidate(true).replace(
    "if (action.type === 'sort') order = action.order;",
    "if (action.type === 'sort') { order = action.order; selectedId = null; }"), 'sort-retarget'],
  ['quirk-improvement', 'hidden selection reappears without reselection', candidate(true)
    .replace('if (improved && !visible.includes(selectedId)) selectedId = null;', '')
    .replace('improved ? selectedId :', 'improved ? (visible.includes(selectedId) ? selectedId : null) :'), 'no-results-then-restore'],
  ['quirk-parity', 'out-of-range index wrongly discarded', candidate(false).replace(
    'const selected = improved',
    'if (selectedIndex !== null && selectedIndex >= visible.length) selectedIndex = null; const selected = improved'), 'hidden-index-reappears'],
  ['quirk-improvement', 'hidden pins dropped from snapshots', candidate(true).replace(
    'rows.filter(row => pins.has(row.id))',
    'rows.filter(row => pins.has(row.id) && visible.includes(row.id))'), 'preserve-hidden-pins'],
  ['quirk-improvement', 'pin order follows visible sort', candidate(true).replace(
    'rows.filter(row => pins.has(row.id)).map(row => row.id)',
    'visible.filter(id => pins.has(id))'), 'canonical-pin-order'],
  ['quirk-improvement', 'filter silently trimmed', candidate(true).replace('query = action.text;', 'query = action.text.trim();'), 'case-and-exact-filter'],
  ['quirk-improvement', 'pin cannot toggle off', candidate(true).replace(
    'if (pins.has(selected)) pins.delete(selected); else pins.add(selected);',
    'pins.add(selected);'), 'select-toggle'],
];

for (const [id, name, source, label] of mutants) {
  test(`selection assertion catches: ${name}`, t => {
    const report = runCheck(id, fixture(t, source));
    assert.equal(report.status, 'comparison-failed', JSON.stringify(report));
    assert.equal(report.errored, 0);
    assert.ok(report.failureDetails.some(f => f.label === label && f.reason === 'value-mismatch'), JSON.stringify(report));
    assert.equal(report.humanReview, 'pending');
  });
}

test('the same trace distinguishes original parity from the approved requirement', () => {
  const parity = casesFor('quirk-parity').find(c => c.label === 'sort-retarget');
  const improved = casesFor('quirk-improvement').find(c => c.label === 'sort-retarget');
  assert.deepEqual(parity.input, improved.input);
  assert.deepEqual(parity.expected.at(-1), {visible:['c','b','a'],selected:'c',pinned:['c']});
  assert.deepEqual(improved.expected.at(-1), {visible:['c','b','a'],selected:'a',pinned:['a']});
});

test('editing one selection fixture cannot contaminate another profile or later run', () => {
  const original = casesFor('quirk-parity');
  const fresh = casesFor('quirk-parity');
  original[3].input[0].index = 2;
  original[3].expected[0].visible.length = 0;
  assert.deepEqual(casesFor('quirk-parity'), fresh);
  assert.equal(casesFor('quirk-improvement')[3].input[0].index, 0);
  assert.deepEqual(casesFor('quirk-improvement')[3].expected[0].visible, ['a','b','c']);
});

test('incomplete-evidence case has no automatic grade and never executes a candidate', t => {
  const file = fixture(t, `import fs from 'node:fs'; fs.writeFileSync(new URL('./executed',import.meta.url),'yes'); export function evaluate(){return null;}`);
  assert.throws(() => runCheck('retry-uncertainty', file), /No executable oracle/);
  assert.equal(fs.existsSync(path.join(path.dirname(file), 'executed')), false);
});
