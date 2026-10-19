// MIT. Frozen composition of the existing schema-2 reconstruction and custom listing.
import { createStore as ledger } from '../version-change/candidate-v2.mjs';
import { titles } from '../version-change/summary.mjs';
export function createStore(options) {
  const store = ledger(options);
  return { ...store, listTitles: () => titles(store.state()) };
}
