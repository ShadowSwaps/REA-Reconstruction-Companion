// MIT. Shared composition; implementations are supplied only by the fixed runner.
export function pipeline(score, format, value) {
  return format(score(value));
}
