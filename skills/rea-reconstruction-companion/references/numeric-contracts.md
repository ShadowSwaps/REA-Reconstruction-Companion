# Numeric values, rounding and units

For numeric quantities, use [numeric contracts](numeric-contracts.md) to separate localized input/display from canonical values, recover representation and explicit rounding mode/stage, and preserve unit meaning through conversion, storage and export. Keep unresolved original rules explicit and validate values beyond formatted equality.

Use this when a selected field or transformation depends on numeric meaning.
Extend the existing finding/requirement/acceptance rows, rather than create a
parallel arithmetic framework. Recover the original's supported rules and the
user's requirements; a convenient runtime default is not evidence of either.

## Trace the value across boundaries

Record input bytes and grammar → validation → domain value/representation →
transformations → storage/import/export → display. Bind observations to artifact,
scenario, runtime, locale/numbering system/options and relevant configuration.
Separate static/runtime observations, causal hypotheses, desired requirements
and proposed implementation. A screen showing `1,234` cannot establish whether
the comma is decimal or grouping, the stored type, precision or unit. Keep each
consequential unknown and its impact explicit; use [evidence reconciliation](reconstruction-methods.md#conflicting-evidence-and-ambiguous-behavior)
to select a distinguishing observation. Planning does not authorize building.

| Contract | Recover and test where consequential |
| --- | --- |
| Input versus display | Explicit accepted grammar/locale, digits, decimal/grouping separators and grouping positions, sign, whitespace, exponent and unit suffix. Distinguish invalid, absent/null and zero. Reject ambiguity or obtain the needed grammar; do not strip punctuation or guess from the host locale. A formatter is not a locale parser. |
| Value representation | Integer/scaled integer, decimal, rational or binary floating representation, supported range/scale, overflow/underflow and finite/nonfinite policy. Distinguish numeric equality, canonical byte equality and retained significant precision/trailing zeros. Do not coerce invalid/absent input into zero or claim exact decimal semantics from formatted binary values. |
| Rounding | Precision/quantum, mode including positive/negative ties, zero/sign behavior and **stage**: input, each transformation, aggregate, storage or display. Rounding before conversion/aggregation can differ from rounding once afterward; recover required intermediate rules rather than always choosing one strategy. Formatting digits alone do not define domain rounding. |
| Units and conversion | Quantity identity/dimension, unit identifier, factor, any offset, direction and authoritative basis/version. A label change is not conversion; scaling alone cannot implement an affine conversion. Preserve original unit/precision metadata when required. Do not guess ambiguous or specialized domain conventions. |

Choose an adequate existing representation from the supported range and rules;
do not build a general decimal/localization engine or add a dependency by default.
If correctness depends on unresolved specialized finance, medical or regulatory
rules, checkpoint the scope and evidence needed rather than inventing them.

## Freeze distinguishing checks

Use applicable reference results or separately reasoned literal expectations
before candidate adaptation. Disclose fixture authorship and shared runtime;
freezing same-author arithmetic is not independent authorship. Include useful
ordinary cases and selected boundaries: fractions not exactly representable in
binary, positive/negative zero and ties, just below/above a rounding threshold,
range/scale limits, invalid/nonfinite/absent input and an ambiguous separator.
Exercise the relevant order of rounding and unit transformations through actual
values/state. A faulty variant should pass ordinary cases before the intended
boundary assertion rejects its wrong value; exceptions or harness failures do
not establish that assertion's effectiveness.

Declare exact versus approximate comparison per requirement. Use exact checks
for exact integers, required canonical bytes or preserved scale. For approximate
values, justify units, absolute/relative tolerance, near-zero behavior and error
budget from the contract/reference precision; handle nonfinite values explicitly.
Do not apply a broad epsilon, compare only formatted strings or round both sides
until a mismatch disappears. Equal displays can conceal different stored values.
Retain hard requirements and existing compatibility oracles.

Apply [file compatibility](file-compatibility.md) at storage/import/export:
verify literal types, values, unit/scale metadata and bytes where required, then
actually save/export/import/reopen in disposable paths. Change display grammar
without silently rewriting canonical data. On semantic rejection inspect prior
bytes and reopened state; a reader/writer self-roundtrip alone can share a bug.
State lossy transformations and unsupported readers/directions explicitly;
never drop unit meaning to make an export pass. Keep caught rejection separate
from crash durability, concurrent writes and hostile-path guarantees.

Retain historical evidence and reassess dependent requirements/tests when the
grammar, representation, rounding stage/mode, conversion basis or relevant runtime
changes using [checkpoint guidance](checkpoints.md#on-resuming). Finite vectors
do not establish all locales, arbitrary precision or an original app's semantics.
The repository-only `evals/numeric-contracts/README.md` illustrates one proposed
fixed length profile; standalone skill installations omit it.

## Runtime sources for the bounded example

Checked 21 October 2026: [ECMAScript safe integers](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.max_safe_integer)
bound exact integer representation; [Math.round](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.round)
resolves ties toward positive infinity. [NumberFormat](https://tc39.es/ecma402/#numberformat-objects)
defines formatting, not an inverse locale parser. [BIPM SI prefixes](https://www.bipm.org/en/measurement-units/si-prefixes)
establish centi/micro factors. These sources support runtime/factor facts, not a
recovered application's rounding, grammar, unit meaning or persistence policy.
