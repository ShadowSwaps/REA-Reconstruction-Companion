export const encode = (entries, version = 2) => Buffer.from(JSON.stringify({
  format: 'pocket-ledger', version, entries
}));
const rows = (count, title) => Array.from({ length: count }, (_, i) => ({
  id: `r${i}`, title, done: i % 2 === 0
}));
export function workloads() {
  return [
    ['small', rows(1, 'Task'), 1000],
    ['typical', rows(8, 'Task 雪😀!'.repeat(4)), 250],
    ['stress-ascii', rows(16, 'abcdefgh'.repeat(10)), 100],
    ['stress-unicode', rows(16, '雪😀a\n'.repeat(20)), 100],
  ].map(([id, expected, iterations]) => ({ id, expected, iterations, bytes: encode(expected) }));
}
// Consume each returned field equally, without adding a second serialization.
export function consume(rows) {
  let sum = rows.length;
  for (const row of rows) sum += row.id.length + row.title.length + Number(row.done);
  return sum;
}
