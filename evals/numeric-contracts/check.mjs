import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import * as candidate from './candidate.mjs';
export const frozen = () => JSON.parse(fs.readFileSync(new URL('./expectations.json', import.meta.url)));
export function compare(api = candidate, rows = [...frozen().ordinary, ...frozen().boundaries]) {
  return rows.map(row => {
    let actual;
    try { actual = api.quantity(...row.args); }
    catch (error) {
      if (!(error instanceof RangeError)) throw error;
      actual = {error: error.message};
    }
    return {id: row.id, expected: row.expected, actual, passed: isDeepStrictEqual(actual, row.expected)};
  });
}
