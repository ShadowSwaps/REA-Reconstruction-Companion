// Reviewer-only, explicit traces. No candidate or reference implementation is
// run to produce these expected snapshots. This is a synthetic fixture model.
const select = index => ({ type: 'select', index });
const filter = text => ({ type: 'filter', text });
const sort = order => ({ type: 'sort', order });
const pin = { type: 'pin' }, clear = { type: 'clear' };
const s = (visible, selected = null, pinned = '') => ({ visible: [...visible], selected, pinned: [...pinned] });

// Each row: label, actions, reference-parity snapshots, approved-improvement
// snapshots (omitted only when identical). No transition logic in the oracle.
const traces = [
  ['empty', [], []],
  ['pin-without-selection', [pin], [s('abc')]],
  ['select-toggle', [select(1), pin, pin], [s('abc', 'b'), s('abc', 'b', 'b'), s('abc', 'b')]],
  ['sort-retarget', [select(0), sort('desc'), pin],
    [s('abc', 'a'), s('cba', 'c'), s('cba', 'c', 'c')],
    [s('abc', 'a'), s('cba', 'a'), s('cba', 'a', 'a')]],
  ['sort-roundtrip', [select(1), sort('desc'), pin, sort('asc')],
    [s('abc', 'b'), s('cba', 'b'), s('cba', 'b', 'b'), s('abc', 'b', 'b')]],
  ['filter-retarget', [select(0), filter('ced'), pin, filter('')],
    [s('abc', 'a'), s('c', 'c'), s('c', 'c', 'c'), s('abc', 'a', 'c')],
    [s('abc', 'a'), s('c'), s('c'), s('abc')]],
  ['hidden-index-reappears', [select(2), filter('amb'), pin, filter(''), pin],
    [s('abc', 'c'), s('a'), s('a'), s('abc', 'c'), s('abc', 'c', 'c')],
    [s('abc', 'c'), s('a'), s('a'), s('abc'), s('abc')]],
  ['visible-selection', [select(2), filter('ced'), pin],
    [s('abc', 'c'), s('c'), s('c')],
    [s('abc', 'c'), s('c', 'c'), s('c', 'c', 'c')]],
  ['filter-select-sort', [filter('e'), select(0), sort('desc'), pin],
    [s('ac'), s('ac', 'a'), s('ca', 'c'), s('ca', 'c', 'c')],
    [s('ac'), s('ac', 'a'), s('ca', 'a'), s('ca', 'a', 'a')]],
  ['no-results-then-restore', [select(0), filter('zzz'), filter(''), pin],
    [s('abc', 'a'), s(''), s('abc', 'a'), s('abc', 'a', 'a')],
    [s('abc', 'a'), s(''), s('abc'), s('abc')]],
  ['explicit-clear', [select(1), clear, sort('desc'), pin, filter('')],
    [s('abc', 'b'), s('abc'), s('cba'), s('cba'), s('cba')]],
  ['preserve-hidden-pins', [select(0), pin, filter('ced'), select(0), pin, filter(''), sort('desc')],
    [s('abc', 'a'), s('abc', 'a', 'a'), s('c', 'c', 'a'), s('c', 'c', 'a'), s('c', 'c', 'ac'), s('abc', 'a', 'ac'), s('cba', 'c', 'ac')],
    [s('abc', 'a'), s('abc', 'a', 'a'), s('c', null, 'a'), s('c', 'c', 'a'), s('c', 'c', 'ac'), s('abc', 'c', 'ac'), s('cba', 'c', 'ac')]],
  ['canonical-pin-order', [sort('desc'), select(0), pin, select(2), pin],
    [s('cba'), s('cba', 'c'), s('cba', 'c', 'c'), s('cba', 'a', 'c'), s('cba', 'a', 'ac')]],
  ['case-and-exact-filter', [filter('CED'), select(0), pin, filter('  '), pin, filter('')],
    [s('c'), s('c', 'c'), s('c', 'c', 'c'), s('', null, 'c'), s('', null, 'c'), s('abc', 'a', 'c')],
    [s('c'), s('c', 'c'), s('c', 'c', 'c'), s('', null, 'c'), s('', null, 'c'), s('abc', null, 'c')]],
  ['expanded-list-selection', [filter('ced'), select(0), filter(''), pin],
    [s('c'), s('c', 'c'), s('abc', 'a'), s('abc', 'a', 'a')],
    [s('c'), s('c', 'c'), s('abc', 'c'), s('abc', 'c', 'c')]],
  ['sort-without-selection', [sort('desc'), pin], [s('cba'), s('cba')]],
  ['unchanged-filter', [select(0), filter(''), pin], [s('abc', 'a'), s('abc', 'a'), s('abc', 'a', 'a')]],
  ['reset-between-invocations', [pin], [s('abc')]],
];

export function selectionCases(id) {
  if (!['quirk-parity', 'quirk-improvement'].includes(id)) throw new Error(`Unknown selection case: ${id}`);
  return traces.map(([label, input, parity, improvement]) => ({
    label,
    input: structuredClone(input),
    expected: structuredClone(id === 'quirk-improvement' ? improvement ?? parity : parity),
  }));
}
