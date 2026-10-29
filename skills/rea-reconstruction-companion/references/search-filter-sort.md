# Search, combined filters and sorting

For search, combined filters or sorted lists, use [search and ordering contracts](search-filter-sort.md) to recover matching/normalization, predicate composition, comparator/missing/tie rules and selection/page behavior. Keep original evidence separate from proposed improvements; choose discriminating ordered-ID and state checks for the selected slice.

Use this for a selected list/search workflow. Extend the existing
[finding and workflow rows](blueprint.md#consequential-workflow-states); a small
contract and a few distinguishing sequences can suffice. Recover observable
behavior before choosing a convenient library default. Planning alone does not
authorize implementation.

## Recover the pipeline and its evidence

Trace input → matching/filter predicates → ordering → page/window → displayed
rows and actions. Locate the responsible client/service and bind observations
to target/version, exact query/data, configuration, locale/comparator/runtime,
initial state and capture. A displayed page is not evidence of the complete
result set, backend ranking or a particular internal algorithm. Keep original
observations, causal hypotheses, user requirements and intentional improvements
separate; use [evidence reconciliation](reconstruction-methods.md#conflicting-evidence-and-ambiguous-behavior)
for consequential ambiguity. Record unresolved choices and their impact.

| Boundary | Recover where it can change the outcome |
| --- | --- |
| Matching | Which fields, exact/prefix/substring/token rules, case handling, accents and Unicode normalization, outer/internal whitespace, empty query versus no matches. Do not universally trim, lowercase or strip accents: these can merge distinct names or change a required original result. A locale-aware comparison does not define substring search. |
| Combined filters | OR/AND within and across controls, absent/unset versus explicit false/zero/empty selections, inclusive/exclusive limits, and missing/null/invalid field policy. Distinguish a predicate rejected by the service from a valid query returning zero rows. |
| Ordering | Actual numeric/date/domain value versus formatted text; comparator, direction, missing/invalid placement and tie rule. Specify source-order stability or an explicit secondary key. Reversing a complete ascending array can reverse ties and move missing values. A stable local sort cannot stabilize a changing/unspecified server order. |
| Identity and view state | Stable row identity distinct from visible index, label and page position; selection when hidden, reordered, deleted or replaced; query/filter/sort page reset versus retention, and clamping after data changes or an empty result. Recover how additions/deletions affect the active view and actions on selected items. Hidden need not mean deleted; retain or clear selection according to the selected contract. |

Keep matching normalization, sort collation, displayed labels and stored values
separately specified. If locale collation matters, record explicit locale and
options such as sensitivity/numeric behavior, actual runtime/ICU data when known
and supported scope; don't infer human alphabetic order from a default comparator.
Refer to [numeric](numeric-contracts.md) and [date/locale](date-locale.md) contracts
when those values determine ordering. Identify whether filtering/sorting happens
before pagination and on which data snapshot. Client sorting of one server page
does not establish global order, counts or correct continuation across pages.
For delayed responses and stale errors/finalizers use
[asynchronous applicability](asynchronous-results.md), including changed input or
owner; do not treat this synchronous pipeline as a backend race solution.

## Freeze discriminating checks

Freeze supported reference outputs or separately reasoned literal expectations
before adapting the candidate. Compare actual ordered identities and relevant
intermediate state, not only counts, labels, set membership or a final screenshot.
Select cases by likely consequence; this is not a mandatory exhaustive matrix:

- Ordinary query/filter/sort, then a consequential case/accent/whitespace or
  partial/empty-query contrast with literal inputs, including normalization
  distinctions only where they affect the chosen profile.
- Combined filters that distinguish AND from OR, explicit zero/false from unset,
  and numeric 2 versus 10, missing values and equal-key items in both directions.
- Select an item, reorder/filter/hide/reveal it and act on its identity; change
  query/filter/sort from a later page, then add/delete rows and check the chosen
  page/selection policy. Preserve source data/order when a view operation should
  be non-mutating. Reset independent cases and retain state within a sequence.

A plausible faulty implementation should pass ordinary checks, then fail a
relevant ordered-value/state assertion. Exceptions or harness errors do not count
as that discriminating failure. State the comparator/locale/runtime assumptions,
fixture authorship/source exposure and untested combinations. Finite local checks
test the declared profile; they do not establish general search correctness,
all locales, real backend/concurrent behavior or original-app parity. Preserve
historical oracles; reassess dependent observations and checks when predicates,
collation/runtime, identity, snapshot or page policy change using
[checkpoint guidance](checkpoints.md#on-resuming).

The repository-only `evals/search-filter-sort/README.md` demonstrates one proposed
catalog profile with literal ID orders and disposable faults. Standalone skill
installations omit it; the guidance above remains usable without that fixture.
