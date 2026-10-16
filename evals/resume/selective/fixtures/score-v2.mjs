// MIT. Synthetic target: same domain, cap changed to 200.
export function score(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1000 ? Math.min(value, 200) : null;
}
