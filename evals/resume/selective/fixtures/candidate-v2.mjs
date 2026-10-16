// MIT. Maintainer-authored reconstruction of score v2.
export function score(value) {
  if (typeof value !== 'number' || value % 1 !== 0 || value < 0 || value > 1000) return null;
  return value > 200 ? 200 : value;
}
