// MIT. Synthetic target: integer score in 0..1000, capped at 100.
export function score(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1000 ? Math.min(value, 100) : null;
}
