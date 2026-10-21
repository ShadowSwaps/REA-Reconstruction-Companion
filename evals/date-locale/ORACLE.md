# Frozen expectations and provenance

The literal `oracle.json` was reasoned before the candidate implementation on
21 October 2026. It specifies a synthetic profile, not an observed application.
Author and checker are source-exposed and the same author; final non-author
review is separate. The candidate never supplies expected values. SHA-256 is
recorded in `identity.json`; it detects drift, not correctness or independence.

- Date meaning is an explicit proposed requirement: Gregorian `YYYY-MM-DD`
  stays that day for every supported viewer zone. Fixed two-digit day/month
  display uses D/M/Y for en-GB and M/D/Y for en-US. Thus March 4 is `04/03/2026`
  or `03/04/2026`. This is a deliberately bounded numeric display contract, not
  a claim about all CLDR punctuation, digits or locales. 2024 is a leap year;
  2026 is not. March 31 precedes April 1 regardless of display lexicography.
- [IANA tzdb 2026b Europe](https://data.iana.org/time-zones/tzdb-2026b/europe)
  supplies EU rules: summer time starts on March's last Sunday at 01:00 UTC,
  ends on October's last Sunday at 01:00 UTC. The Norway commentary selects
  Europe/Berlin for post-1970 rules; the
  [backward links](https://data.iana.org/time-zones/tzdb-2026b/backward)
  link Europe/Oslo to Europe/Berlin. Its standard offset is +01:00; summer
  adds one hour. March 29 and October 25 are the last Sundays in 2026 (the
  next Sundays, April 5 and November 1, fall in the next month).
- Add 60 minutes in winter or 120 in summer to UTC. January 15 22:59:59Z is
  23:59:59; 23:00:00Z is January 16 00:00:00. March 29 00:59:59Z is 01:59:59
  at +01; one second later is 03:00:00 at +02. October 25 00:59:59Z is
  02:59:59 at +02; one second later is 02:00:00 at +01. These arithmetic
  expectations were not produced by Intl or the candidate.
- Wall 02:30 in October has two occurrences: subtract two hours for 00:30Z
  or one for 01:30Z. Require an explicit consistent offset. March's 02:30
  exists under neither offset: +01 maps to 01:30Z, already 03:30 locally;
  +02 maps to 00:30Z, still 01:30 locally. Reject both, all unqualified wall
  inputs, and a summer +01 offset. This is the proposed policy, not a
  universal library default or recovered original policy.
- Persistence retains the calendar date, canonical seconds-only Z instant,
  original qualified wall input and named zone. The literal JSON includes
  fixed field order and LF. Reopen with another locale/UTC display preserves
  those bytes and values. Rejected invalid-day input preserves prior bytes.

The selected runtime consumes its own installed zone data; it does not load
the cited tzdb file. Report Node/V8/ICU/CLDR/tz metadata and explicit resolved
Intl options. Agreement on these 2026 vectors is not proof of all data matching
2026b or future legislation. No dependency, host-zone mutation or remote
execution is needed. No leap seconds, other calendars, recurrence, arbitrary
zones/locales, crash durability or concurrent-writer guarantees are covered.
