// Authored local specimen, not a recovered application. Equal ranks expose the setting.
export function sortRows(rows, tieBreak) {
  if (!['insertion', 'title'].includes(tieBreak)) throw new Error('Unknown tie-break setting');
  return [...rows].sort((a, b) => a.rank - b.rank ||
    (tieBreak === 'title' ? (a.title < b.title ? -1 : a.title > b.title ? 1 : 0) : 0))
    .map(row => row.id);
}
