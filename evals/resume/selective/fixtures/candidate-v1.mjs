// MIT. Maintainer-authored reconstruction of score v1.
export function score(value) {
  if (typeof value !== 'number' || value % 1 !== 0 || value < 0 || value > 1000) return null;
  return value > 100 ? 100 : value;
}
