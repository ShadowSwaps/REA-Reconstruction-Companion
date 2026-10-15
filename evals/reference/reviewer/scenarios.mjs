// Hand-authored expectations. Never import the target or derive these from its output.
const item = (id, title, done = false) => ({ id, title, done });
const a = item('t1', 'Alpha'), b = item('t2', 'Beta'), c = item('t3', 'Gamma', true);
const initial = [a, b, c];
const state = (items, nextId = 4) => ({ schema: 1, nextId, items });
const view = (items = initial, selected = null, filter = 'all', dirty = false, error) =>
  ({ ok: !error, ...(error ? { error } : {}), view: { items, selected, filter, dirty } });
const step = (commands, expected, store = null) => ({ input: JSON.stringify(commands), expected, store });

export const scenarios = [
  { name: 'startup and unsaved draft', steps: [
    step([], []),
    step([{ op: 'view' }, { op: 'add', title: '  Delta Ω  ' }], [view(), view([...initial, item('t4', '  Delta Ω  ')], null, 'all', true)]),
    step([{ op: 'view' }], [view()]),
  ] },
  { name: 'save, cancel and restart', steps: [
    step([{ op: 'select', index: 1 }, { op: 'rename', title: '  Beta Ω  ' }, { op: 'save' }, { op: 'toggle' }, { op: 'cancel' }], [
      view(initial, 't2'), view([a, item('t2', '  Beta Ω  '), c], 't2', 'all', true),
      view([a, item('t2', '  Beta Ω  '), c], 't2'), view([a, item('t2', '  Beta Ω  ', true), c], 't2', 'all', true),
      view([a, item('t2', '  Beta Ω  '), c], 't2'),
    ], state([a, item('t2', '  Beta Ω  '), c])),
    step([{ op: 'view' }], [view([a, item('t2', '  Beta Ω  '), c])], state([a, item('t2', '  Beta Ω  '), c])),
  ] },
  { name: 'filter changes row selection', steps: [step([
    { op: 'select', index: 0 }, { op: 'filter', value: 'done' }, { op: 'toggle' }, { op: 'filter', value: 'open' }, { op: 'cancel' },
  ], [view(initial, 't1'), view([c], 't3', 'done'), view([], null, 'done', true),
    view([a, b, item('t3', 'Gamma')], 't1', 'open', true), view([a, b], 't1', 'open')])] },
  { name: 'hidden selection returns', steps: [step([
    { op: 'select', index: 1 }, { op: 'filter', value: 'done' }, { op: 'remove' }, { op: 'filter', value: 'all' },
  ], [view(initial, 't2'), view([c], null, 'done'), view([c], null, 'done', false, 'no-selection'), view(initial, 't2')])] },
  { name: 'removal shifts selection', steps: [step([
    { op: 'select', index: 0 }, { op: 'remove' }, { op: 'rename', title: 'Moved' }, { op: 'cancel' },
  ], [view(initial, 't1'), view([b, c], 't2', 'all', true), view([item('t2', 'Moved'), c], 't2', 'all', true), view(initial, 't1')])] },
  { name: 'empty store stays empty', steps: [
    step([{ op: 'select', index: 0 }, { op: 'remove' }, { op: 'remove' }, { op: 'remove' }, { op: 'save' }], [
      view(initial, 't1'), view([b, c], 't2', 'all', true), view([c], 't3', 'all', true), view([], null, 'all', true), view([]),
    ], state([])),
    step([{ op: 'view' }, { op: 'add', title: 'Fourth' }, { op: 'save' }], [view([]), view([item('t4', 'Fourth')], null, 'all', true), view([item('t4', 'Fourth')])], state([item('t4', 'Fourth')], 5)),
  ] },
  { name: 'cancel restores identifier counter', steps: [step([
    { op: 'add', title: 'Discard' }, { op: 'cancel' }, { op: 'add', title: 'Keep' }, { op: 'save' },
  ], [view([...initial, item('t4', 'Discard')], null, 'all', true), view(), view([...initial, item('t4', 'Keep')], null, 'all', true), view([...initial, item('t4', 'Keep')])], state([...initial, item('t4', 'Keep')], 5))] },
  { name: 'dirty reflects persisted content', steps: [step([
    { op: 'select', index: 0 }, { op: 'toggle' }, { op: 'toggle' }, { op: 'rename', title: 'Other' }, { op: 'rename', title: 'Alpha' },
  ], [view(initial, 't1'), view([item('t1', 'Alpha', true), b, c], 't1', 'all', true), view(initial, 't1'), view([item('t1', 'Other'), b, c], 't1', 'all', true), view(initial, 't1')])] },
  { name: 'invalid commands preserve state', steps: [step([
    null, [], {}, { op: 'wat' }, { op: 'filter', value: 'invalid' }, { op: 'select', index: -1 }, { op: 'select', index: 0.5 },
    { op: 'add', title: '  ' }, { op: 'rename', title: ' ' }, { op: 'rename', title: 'Valid' }, { op: 'toggle' }, { op: 'remove' },
  ], ['invalid-command', 'invalid-command', 'invalid-command', 'unknown-op', 'invalid-filter', 'invalid-selection', 'invalid-selection', 'invalid-title', 'invalid-title', 'no-selection', 'no-selection', 'no-selection'].map(error => view(initial, null, 'all', false, error)))] },
  { name: 'import existing schema', initialStore: JSON.stringify(state([item('t9', 'Imported', true)], 10)), steps: [step([
    { op: 'view' }, { op: 'add', title: 'Next' }, { op: 'save' },
  ], [view([item('t9', 'Imported', true)]), view([item('t9', 'Imported', true), item('t10', 'Next')], null, 'all', true), view([item('t9', 'Imported', true), item('t10', 'Next')])], state([item('t9', 'Imported', true), item('t10', 'Next')], 11))] },
  { name: 'malformed store is preserved', initialStore: '{broken', steps: [{ input: '[{"op":"save"}]', exit: 2, unchanged: true }] },
  { name: 'invalid batch is rejected before saving', steps: [{ input: '{"op":"save"}', exit: 2, store: null }] },
];
