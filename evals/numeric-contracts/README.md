# Bounded numeric quantity contract

Run `node --test tests/numeric-contracts.test.mjs` from the repository root.
Existing Node 20+ built-ins only; offline, synthetic, disposable files, no host
locale/settings changes. This repository-only example is omitted from installed
skills. Candidate, fixture and tests are source-exposed and same-author; this is
tested proposed behavior, not original-app parity or a model benchmark.

## Frozen profile and independently reasoned literals

`expectations.json` was authored and hash-frozen in `identity.json` before the
candidate existed or ran. Expectations use the following arithmetic, not a call
to the candidate or another invocation of the same runtime decimal conversion:

- Signed length/displacement, inclusive -1000 to 1000 metres. Input is an ASCII
  string with optional ASCII minus, no plus/leading zeros/whitespace/grouping,
  mandatory integer part, and optional 1–3 fractional digits. `dot` and `comma`
  explicitly choose the decimal mark; they are two fixed teaching grammars,
  not complete locales. `1,234` is 1.234 under comma and rejected under dot.
  Missing/null, nonfinite, exponent, mixed separators and unsupported units reject.
- Only m and cm input, canonical integer micrometres (`um` wire identifier).
  SI centi = 10^-2 and micro = 10^-6: 1 m = 1,000,000 um, 1 cm = 10,000 um;
  offset zero. Three fractional cm digits are multiples of 10 um. All accepted
  canonical values and intermediates are exact safe integers; arbitrary real
  precision is unsupported. Input trailing zeros/significant precision are
  deliberately not retained. Negative zero normalizes to zero.
- Display in cm with exactly two decimals, no grouping, ASCII minus and ` cm`.
  Round half away from zero **once for display after conversion**, never storage.
  1.005 cm is 10,050 um: 100 whole hundredths plus exactly half, hence 1.01 cm.
  Negative tie is -1.01; 1.025 gives 1.03 (distinguishes half-even).
  1.004 is 10,040 um, below half, hence 1.00. 0.015 m is 15,000 um = 1.50 cm;
  rounding metres first would yield 2.00 cm. 0.001 cm is 10 um and displays zero
  while remaining nonzero in storage; negative rounded zero displays `0.00 cm`.
- Version 1 JSON contains exactly schema/unit/value in that order with one LF.
  Literal export for 1.005 cm is `{"schema":1,"unit":"um","value":10050}` plus LF.
  Imports accept this canonical encoding only, rejecting duplicate/extra fields,
  alternate numeric spellings, wrong units/schema and fractional/unsafe values.
  This strict wire choice is proposed, not a generic JSON requirement.

Actual save/export/import/reopen checks compare literal values **and bytes**,
then change display grammar without rewriting stored values. Semantic rejection
preserves prior bytes. Write failures/crash durability/concurrent writers and
hostile paths are untested; direct writes do not establish atomic save behavior.

Faulty disposable variants pass ordinary whole-number cases before targeted
value/state checks reject separator guessing, binary decimal rounding, negative
ties, half-even ties, rounding before conversion, fractional unit conversion,
and persisting rounded display. Exceptions/load failures do not count as their
targeted rejection. Exact comparisons use no epsilon. Same display can conceal
unequal quantities; same number with a different unit is a different contract.
Frozen literals avoid algorithm self-comparison but are not independent authorship.
Coverage is finite, not a finance/medical/regulatory or general arithmetic claim.

Runtime and SI sources checked 21 October 2026:
[safe integer limits](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.max_safe_integer),
[Math.round tie direction](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.round),
[NumberFormat](https://tc39.es/ecma402/#numberformat-objects),
[BIPM SI prefixes](https://www.bipm.org/en/measurement-units/si-prefixes).
Binary floating values and Math.round's positive-infinity tie direction do not
supply this profile's decimal half-away rule. Formatting APIs supply no inverse
locale-parser contract. SI prefix factors do not decide an application's meaning.
