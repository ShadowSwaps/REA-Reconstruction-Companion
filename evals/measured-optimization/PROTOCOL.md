# MO-20261018: frozen experiment plan

Frozen before baseline measurement and candidate implementation. Source-exposed,
same-agent synthetic teaching experiment; no independent review or held-out data.
Target: `createStore().importBytes(bytes)` from the existing Pocket Ledger
reconstruction at commit `b5f0e4debfcbc65d0ead435ec14db5629c551eec`.
The original reference, reconstruction, corpus, identity and observations remain
unchanged. Its [contract](../import-export/CONTRACT.md) and literal corpus are
the acceptance oracle, supplemented by contract-derived boundaries and generated
inputs. Agreement alone is insufficient. No installed application is changed.

## Hypothesis and decision

Observed source: each title uses `Array.from(title)` followed by `.some()` to
count scalars and reject lone surrogates. Hypothesis: materializing/scanning
these arrays contributes meaningfully to complete in-memory import cost when
titles are long. Investigate with one baseline CPU profile using Node's existing
profiler. One candidate only: validate/count scalar values in one iteration,
without a temporary character array. No artificial baseline work or other tuning.
Retain the candidate as an explicitly experimental variant even if the timing
benefit is inconclusive; never replace the historical implementation.

Accept behavior only if frozen corpus, boundary, generated sequence, export,
preservation, startup and caught persistence-fault checks pass. Report performance
per workload; prefer the candidate only for workloads with repeatable lower
median complete-import elapsed time across both final processes. Overlap,
regressions, short batches and run-to-run disagreement limit that inference.
No universal speed guarantee, CI timing gate or requirement to produce a speedup.

## Fixed workloads and measurement boundaries

`workloads.mjs` constructs exact bytes and expected rows before timing:
small = 1 short ASCII row; typical = 8 mixed Unicode rows, 32 scalars/title;
stress-ascii = 16 rows, 80 ASCII scalars/title; stress-unicode = 16 rows,
80 mixed astral/BMP/control scalars/title. These are synthetic distributions,
not measured production traffic. All fit the existing 16-row/8192-byte limits.
Adversarial/errors belong to correctness checks, not success-path timing.

Measure repeated complete imports in an in-memory store, including UTF-8/JSON
decode, validation, canonical v2 serialization, state replacement and returned
row copies. Consume every returned row's id/title/done into a checksum in the
timed loop (includes consumer overhead equally for both). Setup, module loading,
input generation, correctness assertions, store construction and JSON output
are excluded. No filesystem/network, cold startup or durable import latency is
measured. Reuse identical immutable bytes; check bytes/state/output outside
timing. New stores per batch, imports within each batch replace identical state.

Use `performance.now()` elapsed milliseconds. Default Node runtime, no forced
GC or JIT flags; record Node/V8/platform/architecture and flags. Ordinary shared
host, background load/power/scheduling uncontrolled; no affinity/isolation claim.
No memory, allocation-rate, peak RSS, CPU-time or energy measurement/claim.

## Bounded budget and reporting

Before candidate: one exploratory baseline run (12 samples/workload) and one
instrumented baseline profile (50,000 stress-unicode imports). After candidate
and correctness: exactly two final process invocations. No discarded samples,
calibration, adaptive repetitions or reruns to seek favorable timings. Execution
failures are retained separately; any necessary protocol revision gets a new
identity and explicit reason before new measurements.

Each process: 2 warmup batches per variant/workload, then 12 paired batches;
baseline-first on even pairs, candidate-first on odd pairs. Workloads rotate by
pair, preserving all samples/order; final process 2 reverses starting order.
Batch imports: small 1000, typical 250, each stress 100. Store raw batch elapsed
times and checksums. Report min/median/max per-import microseconds and paired
candidate/baseline median ratios for each process. These 12 batch observations
are not individual-request tail percentiles, confidence intervals or independent
trials. Explain batch durations, variability and consumer/instrumentation cost.
Keep exploration separate from final results and retain unsuccessful outcomes.

Public evidence includes source/workload/protocol digests and portable runtime
metadata. Raw profiler paths and private host identity stay outside the repo;
publish only a sanitized attribution summary. Timing observations apply only to
the retained workloads, implementation and runtime; CI correctness on another
platform does not become a benchmark on that platform.
