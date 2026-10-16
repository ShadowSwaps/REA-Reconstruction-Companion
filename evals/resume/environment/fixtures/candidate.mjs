// MIT. Fixed maintainer reconstruction, not an inferred agent patch.
export function score(value, cap) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1000) return null;
  return value > cap ? cap : value;
}
