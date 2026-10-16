// MIT. Synthetic reference: configuration changes behavior without byte changes.
export const score = (value, cap) => Number.isInteger(value) && value >= 0 && value <= 1000 ? Math.min(value, cap) : null;
