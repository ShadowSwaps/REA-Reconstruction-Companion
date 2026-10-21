# Bounded search, filter and sort contract

Run `node --test tests/search-filter-sort.test.mjs` from the repository root.
Existing Node 20+ built-ins only; offline, synthetic in-memory data and disposable
mutant modules. This repository-only example is omitted from installed skills.
Candidate, fixtures and tests are source-exposed and same-author. Frozen literals
avoid candidate-derived self-comparison; they are not independently authored.
No original application was observed and no model was run or scored.

## Proposed catalog-v1 profile and literal reasoning

`expectations.json` was authored and hash-frozen in `identity.json` before the
candidate existed or ran. Its 25 cases contain 41 literal intermediate states.
Four ordinary cases use a simple ASCII catalog; the other 21 contrast selected
matching, ordering and state interactions on eight deliberately ordered rows.
Each case starts with a fresh clone. Actions within a case share session state.

- Search title only by substring. Strip only outer U+0020 spaces from the query,
  fold only ASCII A–Z in query and title; preserve internal whitespace, accents
  and Unicode normalization. Empty/all-space queries match every title. There
  is no token/ranking/fuzzy algorithm, general case folding or locale search.
  `cafe` matches `a,b,d,g`, including the decomposed `cafe` + U+0301 in `d`,
  but not precomposed `Café` in `c`. `café` matches only `c`; `CAFÉ` matches none
  because uppercase É is preserved. `Cafe kit` matches `a,g`; two spaces matches
  only `b`. Tabs are not stripped. These are teaching choices, not a recommended
  universal normalization policy or claims about a real application's rules.
- All predicates combine by AND: query, selected kinds (OR within that list),
  active flag and inclusive maximum price. Empty kinds means unrestricted;
  active null means unset, false remains meaningful; maximum null is unset,
  zero remains a real limit. Absent/null price fails an active maximum. Thus
  query `cafe` + book + active true + maximum 2 leaves only `g`; maximum 0 alone
  leaves `d`, never missing values `z,e`.
- Numeric sort uses finite fixture prices, not display/string order. Missing
  null/absent price stays last in both directions. Equal values preserve current
  source/insertion order, including missing ties. Ascending is `d,a,b,g,c,f,z,e`:
  0 then the three 2s, two 10s, then missing. Descending is
  `c,f,a,b,g,d,z,e`; reversing the ascending array breaks both ties and missing
  placement. Titles use raw JavaScript UTF-16 code-unit relational comparison,
  independently of search folding: `e,f,b,a,g,c,z,d`. Space precedes `k`, plain
  `e` precedes é, uppercase Z precedes lowercase c. No locale/ICU collation is
  invoked and no locale support is inferred. Stable Array.sort is assumed on
  supported Node 20+; exact runtime belongs in the actual validation report.
- Filter → sort → page, over the complete local snapshot. Page size 3, zero
  based. Each view action (query/filter/sort, even a repeated value) resets to 0.
  Page navigation clamps into the valid range; empty results use page 0.
  Add/delete retains the page then clamps and recomputes its contents. Adding
  price-1 `h` shifts a price-sorted page rather than appending to that page.
- Select by current page index once, then retain the resolved stable ID across
  sorting/filtering/pages. `shown` means present on the current page. A hidden
  selection remains selected and can reappear; removing its row clears it.
  The sequence selects `a`, sorts it into position 2, hides/reveals it and
  removes it. Data action coverage also removes the selected ID from an actual
  sorted view. These policies are explicit proposed choices, not universal UX.

Snapshot checks compare complete ordered IDs, page, visible IDs, selected ID and
visibility after each action. They do not derive an answer by calling the
candidate sorting/search routine. View operations do not mutate source order or
caller input. Valid, unique string IDs and the supplied bounded row/action shapes
are preconditions; malformed general API inputs, invalid numeric data, persistence,
server pagination/ranking/counts, latency and concurrent changes are outside scope.
The factory is an example, not a production search API or input-validation engine.

## Fault discrimination and limits

Eleven disposable faulty implementations must first pass all four ordinary
checks, then fail a named ordered-value/state checkpoint: accent stripping,
canonical normalization, whitespace collapsing, OR across filters, text ordering
of prices, missing-as-zero, reversing ties/missing, selection by position,
retained page on changed query, missing page clamp, and retained deleted selection.
Exceptions, module-load failures and harness errors propagate and are not useful
kills. The diagnostics retain actual expected/observed states. Additional checker
controls corrupt order/page/selection and inject an infrastructure failure.

Finite source-exposed local success establishes the declared proposed profile
only. It does not establish original parity, general search-engine correctness,
arbitrary Unicode/locale support, real UI integration, remote/backend behavior,
asynchronous stale-result handling or genuine concurrency. Use the separate
[async guidance](../../skills/rea-reconstruction-companion/references/asynchronous-results.md)
where delayed work applies; no async fixture is duplicated here.

Runtime sources checked 21 October 2026: [ECMAScript Array.sort](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort)
requires stable equal-key ordering; [Intl.Collator](https://tc39.es/ecma402/#sec-intl.collator)
defines locale/options-sensitive comparison. Neither decides this example's
matching, missing-value, selection or page policy. All expected ID orders were
reasoned from the declared profile, not obtained from these sources or an app.
