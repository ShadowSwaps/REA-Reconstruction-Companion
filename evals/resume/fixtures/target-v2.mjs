// MIT. Synthetic local reference: score-function build 2.0.0.
export function evaluate(value) {
  if (!Number.isInteger(value) || value < 0 || value > 1000) return null;
  return Math.min(value, 200);
}
