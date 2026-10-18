# Measured optimization: an unsuccessful candidate

Runnable, model-independent Pocket Ledger import experiment using Node.js 20+
and standard libraries only. No package install, service, model API or profiler
installation. Same-agent, source-exposed synthetic example and review; neither
blind nor independent evaluation. The existing [reconstruction](../import-export/candidate.mjs),
[reference and literal oracle](../import-export/README.md) are preserved.

The candidate removes the temporary character array used for Unicode title
validation. It passes the selected behavior tests, but the bounded measurement
**does not demonstrate an overall benefit**. Typical and stress medians are
higher in both final processes; small-input medians disagree. Keep the original
implementation for this workload. Fewer explicit intermediate arrays did not
establish faster complete imports or measured lower memory use.

## Run and inspect

From the repository root:

```sh
node evals/measured-optimization/check.mjs
node --test tests/measured-optimization.test.mjs
node evals/measured-optimization/summary.mjs
```

The checker needs a writable OS temporary parent and local child-process access
for the historical persistence/CLI checks. Set `TEMP`/`TMP` on Windows or `TMPDIR`
elsewhere to a disposable writable directory if necessary. A blocked check is
unrun/failed environment evidence, never a behavior pass. The standard full
suite uses the existing capability preflight; do not bypass it to hide failures.

To repeat the experiment as a **new** observation, read [PROTOCOL.md](PROTOCOL.md),
choose fresh output files outside the repository and retain every invocation:

```sh
node evals/measured-optimization/bench.mjs baseline > baseline-new.json
node evals/measured-optimization/profile.mjs > profile-new.json
node evals/measured-optimization/bench.mjs final-1 > final-1-new.json
node evals/measured-optimization/bench.mjs final-2 > final-2-new.json
```

Use default Node without `NODE_OPTIONS` or runtime flags. Setup/input generation,
module loading, stores and assertions are outside timing. Each sample times the
same complete in-memory import and consumes every returned row's fields. Raw
evidence records all samples, alternating variant order, rotating workload order,
workload/source digests, warmup and batch sizes. No adaptive reruns. To summarize
a new record, import `summarize` from `summary.mjs` and pass the parsed JSON; it
checks the record against these exact sources and workload/order contracts.
Changed sources need a new protocol/identity, not overwritten historical results.
The checker verifies structure, hashes and arithmetic; it cannot prove a supplied
timing was honestly measured or validate arbitrary prose performance claims.

## Retained observation (2026-10-18)

Plan was committed as `ec7c16a747cbe88db7a60fb5a01f697c522fc31a` before baseline
and candidate. [Baseline](baseline.json) and [CPU attribution](profile.json) are
exploratory. Exactly two final processes produced [run 1](final-1.json) and
[run 2](final-2.json), without a discarded sample or favorable-result rerun.
[summary.json](summary.json) is recomputed/checked from these raw observations.
Only Windows / Node v24.21.0 / V8 13.6.233.17-node.53 was measured; see raw metadata
for architecture. Default runtime, ordinary shared host, uncontrolled background
load/power/scheduling. No other runtime/platform benchmark is claimed.

Each entry below is min / median / max microseconds per import, derived from
12 batch elapsed times. Ratios are the median of 12 paired candidate/baseline
batch ratios; they need not equal the ratio of the two marginal medians.

| Workload | Process | Original µs | Candidate µs | Paired ratio | Candidate faster pairs |
| --- | --- | --- | --- | --- | --- |
| small | 1 | 1.90 / 2.14 / 2.88 | 1.84 / 2.05 / 2.67 | 0.949 | 8/12 |
| small | 2 | 1.91 / 2.12 / 3.29 | 1.90 / 2.17 / 2.70 | 0.985 | 7/12 |
| typical | 1 | 9.45 / 10.10 / 12.12 | 9.92 / 10.49 / 14.24 | 1.013 | 5/12 |
| typical | 2 | 9.60 / 10.35 / 15.48 | 9.85 / 10.56 / 15.64 | 1.021 | 5/12 |
| stress-ascii | 1 | 18.44 / 20.95 / 27.04 | 19.03 / 21.96 / 25.48 | 1.026 | 4/12 |
| stress-ascii | 2 | 18.51 / 19.87 / 32.19 | 20.01 / 22.04 / 28.78 | 1.095 | 2/12 |
| stress-unicode | 1 | 30.28 / 34.22 / 43.81 | 32.33 / 35.09 / 38.56 | 1.010 | 4/12 |
| stress-unicode | 2 | 30.97 / 32.63 / 47.44 | 32.58 / 36.69 / 45.80 | 1.083 | 1/12 |

The minimum final batch duration was about 1.84 ms. Short batches, overlapping
ranges, JIT/GC and two shared-host processes limit inference; these are not
individual-request percentiles or statistical confidence intervals. The small
case's paired ratios look favorable but marginal medians disagree across runs;
do not select that metric alone to advertise success. The sampled profile puts
534 hits in baseline `decode`, 206 in `serialize`, 44 in GC and 312 elsewhere;
it does not isolate array creation or prove the hypothesized mechanism. No
allocation volume, heap delta, peak memory, CPU time or energy was measured.

## Behavior and limits

[Correctness](correctness.json): the actual historical checker passes 33 frozen
and boundary cases per target, cross-reader exports, validation-failure state
preservation, controlled persistence faults, retry and reload. Its historical
CLI restart checks remain checks of that CLI; the variant adds no CLI. New checks
cover 12 literal Unicode boundaries, all timed workloads, detached state copies
and 256 deterministic bounded sequences with contract-derived expected rows or
errors, byte preservation, state and exact serialized output comparisons. Tests
challenge the actual oracle with corrupt output/destructive rejection and the
actual measurement checker with missing/duplicate/reordered samples, wrong
identities/workloads/checksums, invalid timing and unsupported resource fields.

An initial local checker invocation failed on persistence in the default temp
parent; selecting an authorized writable disposable temp parent resolved that
check. The full-suite default preflight separately observed a denied junction
and left full validation unrun. Neither was treated as a product pass or as an
explanation of arbitrary later failures. Required CI/package checks are separate
from this finite local measurement. No exhaustive equivalence, crash durability,
hostile-path safety, real-user distribution, universal speed or platform guarantee.

Elapsed timing uses Node's existing [performance.now API](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html#performancenow);
the CPU profile uses its local [inspector API](https://nodejs.org/docs/latest-v24.x/api/inspector.html).
No noisy timing threshold runs in CI; CI recomputes/checks the saved observations
and correctness contracts without generating replacement benchmark results.
