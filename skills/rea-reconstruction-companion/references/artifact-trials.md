# Artifact-based reconstruction trials

For a bounded reconstruction trial from packaged or compiled bytes, use the [artifact trial procedure](artifact-trials.md) to freeze identity/oracles, disclose source exposure, connect actual REA findings to runtime checks, and challenge wrong candidates without inventing canonical evidence.

Use this procedure when the selected evidence carrier is a shipped, packaged or
compiled artifact. Keep the requested behavior count and scope fixed. It is a
bounded application of [reconstruction methods](reconstruction-methods.md), not
a new analysis provider or a source-only substitute for REA.

1. **Freeze before rebuilding.** Record license/authority, exact original bytes,
   SHA-256, format, runtime, build provenance when available, selected behaviors,
   literal acceptance/rejection expectations and oracle authorship. Separate
   reference, candidate, raw observations and oracle. Preserve the original even
   when rebuilding changes timestamp/MVID. Hash compiler/tool identities as
   relevant; do not acquire missing tools implicitly.
2. **Declare exposure.** Keep source/build material outside the selected analysis
   input, and record everything actually read or authored. A same-agent synthetic
   fixture remains source-exposed even with separate directories. Separately
   written literals can avoid self-comparison without becoming independently
   authored or hidden tests. A genuine blind trial requires a separate controlled
   author/reviewer arrangement; do not create agents/services to manufacture it.
3. **Route actual bytes.** Apply the base REA skill's supported format route and
   current schemas. Bind findings to artifact hash and build-local coordinates
   such as assembly MVID/method token. Preserve tool/version/options, coverage,
   raw limitations and failures. Metadata, strings and CIL anchors are not
   decompiled source. An anchor summary can omit short constant opcodes and full
   control flow even when method decoding is complete.
4. **Resolve consequential uncertainty.** Trace each selected requirement from
   static facts through an explicit inference to a distinguishing runtime case
   where needed. Test misleading strings/resources against active calls and
   actual behavior. Mark genuinely unavailable details as evidence-limited;
   do not keep behavior unknown once a focused observation resolves it. Disclose
   source knowledge separately instead of attributing it to artifact recovery.
5. **Build and challenge the comparison.** Implement from the recorded contract.
   Run equivalent cases against actual reference and candidate and compare each
   separately to frozen literals, including stdout/stderr, exit/errors and relevant
   state. Keep raw output before justified normalization. Reject capture failure,
   changed identity, missing/duplicate cases and materially wrong candidates;
   agreement between two wrong programs is insufficient.
6. **Keep evidence authority honest.** If the REA runtime adapter is unavailable,
   retain its concrete failure. A permitted ordinary subprocess check is useful
   but is not canonical REA runtime Evidence. Never relabel it to satisfy typed
   reconstruction verification. Use that verifier only with supported comparison
   Evidence. Sanitize public excerpts as transformed excerpts, retaining original
   IDs as provenance references without pretending the edited object has the
   original canonical digest. Keep private originals where appropriate.

State sufficiency per requirement, remaining gaps, fresh versus historical runs
and platform limits. A finite pass establishes agreement within that corpus and
environment; it is not global equivalence, decompiler correctness, performance or
security validation. An unavailable compiler/provider is a concrete limit, not
authorization for a metered API, remote analysis upload or acquisition fallback.

The repository's `evals/artifact/README.md` is a runnable owned example with three
behaviors, actual managed REA findings, an inert misleading resource, source-name
limits, frozen literals and wrong-candidate checks. It requires existing local
tools and records same-agent exposure explicitly.
