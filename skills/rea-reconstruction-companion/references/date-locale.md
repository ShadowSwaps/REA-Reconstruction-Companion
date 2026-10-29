# Date, time-zone and locale contracts

For date/time-zone or locale-dependent behavior, use [date and locale contracts](date-locale.md) to distinguish calendar dates, instants and wall time, select consequential zone boundaries and separate localized display from parsing, sorting and stored/exported values. Preserve unresolved original semantics and explicit gap/overlap policies.

Use this when a selected field or workflow depends on dates, clocks or localized
text. Extend the existing finding/requirement/acceptance rows; do not create a
parallel time framework or infer a calendar system from a product name.

## Establish meaning before conversion

| Meaning | Evidence and contract to recover |
| --- | --- |
| Calendar date | Calendar and year/month/day, valid range, absent/null rules and whether the value stays the same when the viewing zone changes. A birthday or due-date label is a hypothesis about meaning, not proof. Do not assign midnight UTC merely to fit a timestamp API. |
| Instant | Epoch/unit or qualified timestamp, precision, offset and normalization rules. Distinguish the same instant displayed in two zones from two different events. Retain source offset/zone separately when required; normalization can lose them. |
| Local wall time | Calendar date plus clock fields in a selected zone, with a policy for nonexistent or repeated times. A numeric offset identifies an offset at an instant, not a named zone's historical/future rules. An unqualified string may leave the instant unresolved. |

Trace input → validation → domain value → storage/export → display at the selected
boundary. Separate original observations, competing explanations, desired behavior
and proposed implementation. A screenshot saying `03/04/2026` cannot decide day
order, calendar, midnight policy or storage type. Retain unresolved original
zone/calendar/policy and its consequence; use [evidence reconciliation](reconstruction-methods.md#conflicting-evidence-and-ambiguous-behavior)
to choose a distinguishing observation. Planning still does not authorize a build.

Bind relevant evidence to the artifact/scenario and exact input bytes, meaning,
locale, calendar, numbering/hour cycle, named zone, actual offset, clock source
or injected instant, runtime/Intl implementation and available time-zone-data
version. Record unknown metadata rather than guessing it from the host location.
Keep source/event time separate from capture time. Vary explicit per-operation
options or disposable process settings only when needed and authorized; changing
the host time zone is not a controlled reconstruction experiment.

## Select consequential boundaries

Choose cases that distinguish plausible faults within the requested scope:

- The same instant just before/at local midnight, including a UTC/local date
  disagreement; the same date-only value under another viewer zone.
- A selected named-zone offset transition, with observations on both sides.
  For wall-time input, specify reject or explicit disambiguation for gaps and
  overlaps. Do not silently roll a nonexistent time forward or choose one repeated
  occurrence because a library defaults to it. Preserve a required original
  policy separately from an intentional improvement.
- Valid/invalid calendar days and chosen precision/range limits; ambiguous
  localized input versus canonical input; order across a day/month/year boundary.

Freeze literal expectations and their source/arithmetic before candidate work.
Use ordinary cases alongside boundary checks: a useful faulty variant should pass
ordinary cases before a selected check rejects its actual wrong value or state.
Same-author reasoning and a shared runtime remain disclosed; a round trip through
the same conversion is supplemental, not an independent oracle. Finite vectors
and one installed ICU/tzdb result do not establish all zones or future rules.

## Keep presentation separate from data contracts

Specify display locale/calendar/zone and relevant formatting options explicitly.
Localized text may change order, digits, punctuation or spacing across runtimes;
define whether exact bytes or semantic components matter. Formatting is not a
parser contract. Reject ambiguous text or require an explicit input grammar and
locale, instead of silently accepting implementation-specific date parsing.

Sort on the selected semantic value and declared tie-breaker. Lexical ordering
works only for an appropriate fixed canonical representation; formatted display
strings and offset-bearing timestamps need not sort chronologically. Do not
substitute instant ordering for a date-only or wall-time requirement.

Apply [file compatibility](file-compatibility.md) at persistence/import/export:
record types, calendar, precision, offset/zone retention, supported readers and
lossy/rejected transformations. Verify literal stored/exported values and reopen
under another selected display locale/zone; inspect unchanged prior data on
rejection. A display change must not silently rewrite domain values. Reassess
dependent observations/checks when runtime, locale options, zone data or meaning
changes using [version-change guidance](version-changes.md); retain historical
oracles and unrelated applicable evidence.

The repository-only `evals/date-locale/` worked example demonstrates a proposed
bounded Gregorian/Oslo contract with frozen expectations and faulty variants.
It is not installed with the skill, a recovered application's semantics or a
general calendar/recurrence implementation.

## Runtime facts checked for the example

Checked 21 October 2026: [ECMAScript Date.parse](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.parse)
interprets offset-free date-only forms as UTC and offset-free date-time forms as
local time; nonstandard parsing may use implementation heuristics. It does not
require parsing localized output back to the same value. [Intl.DateTimeFormat](https://tc39.es/ecma402/#sec-initializedatetimeformat)
uses the system zone when one is omitted and distinguishes named-zone identifiers
from offset strings. [Node internationalization](https://nodejs.org/api/intl.html)
documents ICU build/data differences. These runtime facts do not decide an
application's intended date semantics; verify the selected runtime and options.
