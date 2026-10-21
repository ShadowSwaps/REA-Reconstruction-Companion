import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {frozen, compare} from '../evals/search-filter-sort/check.mjs';
import {createCatalog} from '../evals/search-filter-sort/candidate.mjs';
const oracle = frozen();
const source = fs.readFileSync(new URL('../evals/search-filter-sort/candidate.mjs', import.meta.url), 'utf8');
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-search-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-search-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, {recursive:true, force:true});
  });
  return dir;
}
test('frozen literal orders and intermediate states match the proposed catalog profile', () => {
  const cases = [...oracle.ordinary, ...oracle.boundaries];
  assert.equal(cases.length, 25);
  assert.equal(new Set(cases.map(row => row.id)).size, 25);
  const rows = compare();
  assert.equal(rows.length, 41);
  assert.deepEqual(rows.filter(row => !row.passed), []);
});
const mutations = [
  {id:'strip-accents', target:'accent-preserved', step:0,
    from:'text.replace(/[A-Z]/g, letter => letter.toLowerCase())',
    to:"text.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[A-Z]/g, letter => letter.toLowerCase())"},
  {id:'normalize-unicode', target:'no-canonical-normalization', step:0,
    from:'text.replace(/[A-Z]/g, letter => letter.toLowerCase())',
    to:"text.normalize('NFC').replace(/[A-Z]/g, letter => letter.toLowerCase())"},
  {id:'collapse-whitespace', target:'internal-spaces', step:0,
    from:'text.replace(/[A-Z]/g, letter => letter.toLowerCase())',
    to:"text.replace(/\\s+/g, ' ').replace(/[A-Z]/g, letter => letter.toLowerCase())"},
  {id:'filter-or', target:'combined-and', step:0, from:'tests.every(Boolean)', to:'tests[0] && tests.slice(1).some(Boolean)'},
  {id:'text-price', target:'numeric-ascending', step:0,
    from:'const delta = a.price - b.price;', to:'const delta = textOrder(String(a.price), String(b.price));'},
  {id:'missing-as-zero', target:'zero-not-missing', step:0,
    from:'row.price != null && row.price <= view.maxPrice', to:'(row.price ?? 0) <= view.maxPrice'},
  {id:'reverse-ties-and-missing', target:'descending-stable-missing-last', step:0,
    from:'return matches.sort((a, b) => {', to:"if (view.sort === 'priceDesc') return matches.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity)).reverse();\n    return matches.sort((a, b) => {"},
  {id:'selection-by-position', target:'selection-identity', step:1,
    from:'page = 0;', to:'selectedId = selectedId === null ? null : ordered()[rows.findIndex(row => row.id === selectedId)]?.id ?? null; page = 0;'},
  {id:'retain-page-on-view-change', target:'query-resets-page', step:1, from:'page = 0;', to:'// page incorrectly retained'},
  {id:'omit-page-clamp', target:'deletion-clamps-page', step:2,
    from:'page = Math.max(0, Math.min(page, Math.max(0, Math.ceil(order.length / pageSize) - 1)));', to:'page = Math.max(0, page);'},
  {id:'keep-deleted-selection', target:'selection-identity', step:4,
    from:'if (selectedId === action.id) selectedId = null;', to:'// deleted selection incorrectly retained'}
];
for (const mutation of mutations) test('ordinary checks pass before ordered state rejects ' + mutation.id, async t => {
  assert.equal(source.split(mutation.from).length, 2, 'exactly one mutation site');
  const file = path.join(temporary(t), 'candidate.mjs');
  fs.writeFileSync(file, source.replace(mutation.from, mutation.to));
  const api = await import(pathToFileURL(file));
  const ordinary = compare(api.createCatalog, oracle.ordinary);
  assert.equal(ordinary.length, 4);
  assert.ok(ordinary.every(row => row.passed), 'all ordinary checks must pass');
  const rows = compare(api.createCatalog, oracle.boundaries);
  const target = rows.find(row => row.id === mutation.target && row.step === mutation.step);
  assert.ok(target, 'target assertion exists');
  assert.equal(target.passed, false, 'intended value/state mismatch, not an exception');
  t.diagnostic(JSON.stringify({mutation:mutation.id, ordinaryPassed:ordinary.length, distinguishing:target}));
});
test('view transformations preserve caller/source data and action identity', () => {
  const original = structuredClone(oracle.datasets.catalog);
  const catalog = createCatalog(original);
  catalog.dispatch({type:'view',value:{sort:'priceAsc'}});
  catalog.dispatch({type:'select',index:0});
  assert.equal(catalog.snapshot().selected, 'd');
  catalog.dispatch({type:'remove',id:catalog.snapshot().selected});
  assert.deepEqual(catalog.data().map(row => row.id), ['c','a','b','z','e','f','g']);
  assert.deepEqual(original, oracle.datasets.catalog);
  const clone = catalog.data(); clone[0].title = 'changed';
  assert.equal(catalog.data()[0].title, 'Café kit');
});
test('checker rejects actual wrong order, page and selection and propagates infrastructure failure', () => {
  assert.throws(() => compare(() => {throw Error('load failed');}), /load failed/);
  for (const change of [state => state.order.reverse(), state => {state.page = 99;}, state => {state.selected = 'wrong';}]) {
    const rows = compare((...args) => {
      const catalog = createCatalog(...args);
      return {dispatch(action) {const state = catalog.dispatch(action); change(state); return state;}};
    });
    assert.ok(rows.some(row => !row.passed));
  }
});
