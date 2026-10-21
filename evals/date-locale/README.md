# Bounded offline date/locale example

This proposed synthetic contract exercises the portable [date guidance](../../skills/rea-reconstruction-companion/references/date-locale.md).
It does not recover another app's intent. No REA binary/runtime investigation was
needed for this source-exposed example. Same-author implementation/checks are not
independent review or model/host certification. Use existing Node 20+; no packages,
network or host-zone changes are needed:

```sh
node evals/date-locale/check.mjs
node --test tests/date-locale.test.mjs
```

Read [frozen expectations and provenance](ORACLE.md), `oracle.json` and its
`identity.json` before `candidate.mjs`. The checker compares actual conversion
outputs with separately reasoned literal values. It records Node/V8/ICU/CLDR/tz
and resolved Intl options. The cited tzdb is a reasoning source, not a dependency
loaded by the test. A mismatch must be investigated; do not regenerate the oracle
from the runtime output. Hash binding is drift detection only.

| Requirement | Component and selected acceptance |
| --- | --- |
| D1: date-only stays a date | `calendar`/`date`: Gregorian years 2000–2099, strict YYYY-MM-DD. March 4 remains March 4 for the west-coast viewer; en-GB/en-US presentation order differs. Invalid and localized date input rejects. |
| D2: instant projection uses selected rules | `project`: strict seconds-only Z input; explicit Gregorian/Latin/h23 Intl options. Winter midnight and spring/autumn instants straddle the named Oslo rule changes. |
| D3: wall time needs an offset consistent with its zone | `wall`: strict seconds plus numeric offset, checked by projecting the resulting instant. Both October occurrences work with their matching offsets; both March gap offsets and unqualified inputs reject. |
| D4: display does not become canonical data | `sort`/`encode`/`decode`: date sorting crosses March/April; literal canonical JSON retains date, instant, original wall offset and named zone. |
| D5: rejected save preserves prior data | `save`/`reopen`: real disposable file writes/reads; changed locale/UTC display leaves bytes and values unchanged; invalid or inconsistent records reject before write. |

Projection accepts only Europe/Oslo, America/Los_Angeles and UTC; locale display
accepts only fixed two-digit en-GB D/M/Y and en-US M/D/Y. Date-only formatting uses
components directly, with no artificial instant. This display profile does not
claim to reproduce arbitrary Intl punctuation or localized month names. Inputs
are synthetic; there are no current-time reads. Range/precision/locale limits
are deliberate requirements rather than recovered universal semantics.

Four temporary faulty candidates each pass all four ordinary cases. The selected
boundary tests then reject their actual values: date-through-UTC shifts the west
viewer date; fixed +01 misses the spring rule; formatted-string sorting reverses
March 31/April 1; unchecked offset conversion accepts a nonexistent wall time.
The tests retain diagnostics with the ordinary counts and distinguishing actual
outputs. A parse/load error or timeout is not an intended mutation kill.

Persistence uses a simple file write after validation: no process-crash, power-loss,
concurrency or hostile-path safety is claimed. No general wall-time resolver,
recurrence/scheduling, full calendar/localization system, leap seconds or custom
zone database is provided. Selected installed-data results are finite evidence,
not a promise about future rules, every zone or another runtime. Historical
fixtures and other examples remain unchanged. This directory is repository-only;
installed skill references must remain self-contained.
