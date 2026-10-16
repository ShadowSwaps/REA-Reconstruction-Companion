// MIT. Component B stays byte-identical across the continuation.
export function format(value) {
  return value === null ? 'invalid' : `score:${value}`;
}
