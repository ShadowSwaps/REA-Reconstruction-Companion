// MIT. Deliberately unfinished: input validation only; cap not implemented.
export function evaluate(value) {
  if (!Number.isInteger(value) || value < 0 || value > 1000) return null;
  return value;
}
