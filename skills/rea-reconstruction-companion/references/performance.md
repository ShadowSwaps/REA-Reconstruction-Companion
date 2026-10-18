# Profiling, optimization, and quality tradeoffs

Use this workflow to understand the reference's performance or improve the reconstruction. Apply it to relevant user journeys; do not assume every app needs every measurement. The reference is a baseline, not evidence of an optimal design. Source IDs refer to the [research basis](research-basis.md).

## Define what good means

Infer the important workloads from the product and user goals: launch/open, interaction, search, save/sync, import/export, background jobs, or sustained processing. Choose realistic data sizes and concurrency, including a large plausible case. Separate user-perceived latency, throughput, resource consumption, and correctness. Record the chosen metric, workload, environment, target, and whether the target is user-specified, measured, or proposed.

Useful measurements, selected by relevance, include cold/warm time to usable state, action latency and responsiveness, CPU/GPU activity, retained/peak memory, disk I/O and stored size, network round trips/bytes, and idle/background work. Measure energy only when supported by suitable measurements; CPU use alone is not an energy result. Check growth across data sizes rather than inferring scaling from one small example.

Include adjacent quality scenarios that an optimization could affect: offline/retry behavior, durability, recovery, accessibility, privacy/security boundaries, and maintainability. Record explicit tradeoffs instead of silently weakening a requirement for speed. These choices are task-specific engineering decisions, not claims that every property of the original has been recovered.

## Establish comparable baselines

Use a repeatable scenario and record build mode, hardware/OS/runtime, data, configuration, cache state, background load, and instrumentation. Compare representative release builds when available; disclose debug/instrumented results. Measure cold behavior separately from warmed steady-state behavior. Repeat runs, report variation and sample count, and avoid treating an isolated fast run as an improvement. Interleave before/after runs when environmental drift matters. Do not claim reliable tail percentiles from inadequate samples. Warmup and repeated-run statistics are supported by [R11](research-basis.md#r11-benchmark-controls); the benchmark plan remains workload-specific.

Distinguish microbenchmarks from end-to-end user outcomes and lab measurements from real-world observations. If the reference cannot run, report static candidates and a benchmark plan, not invented timings. For browser products, user-centric loading, interaction, and layout stability measures may help; lab proxies must not be reported as measured field results. [R14](research-basis.md#r14-web-performance)

## Find the bottleneck and its mechanism

Trace the slow journey and attribute elapsed time to computation, rendering, queueing/locks, allocation/collection, storage, IPC, network, or a remote service. Use resource utilization, saturation, and errors to guide investigation; low average CPU does not rule out bursts or waiting. Missing counters remain unknown. Validate the suspected resource's effect on the user outcome. [R10](research-basis.md#r10-resource-bottlenecks)

Use available tools that fit the target: REA for code/behavior evidence; an appropriate runtime or OS profiler for measurements REA does not expose. On Windows, WPR/WPA can connect CPU, disk, memory, and other system activity; select application/runtime tools when they answer the question more directly. Do not install a profiling suite merely because this guide lists it. [R13](research-basis.md#r13-platform-profiling)

Research current primary documentation for the actual stack and observed problem. For Electron, inspect startup work, main/renderer thread blocking, synchronous I/O/IPC, and unnecessary loading or requests when profiles point there. For other platforms, choose their corresponding mechanisms. A technology checklist is not proof of good performance. [R12](research-basis.md#r12-electron-performance)

Look for reference techniques such as indexing, incremental processing, bounded caching, batching, lazy loading, virtualization, or concurrency only when evidence supports them. Record separately the observed effect, the inferred mechanism, and its relevance to our workload. A cache-like name in a binary does not prove either caching policy or benefit.

## Optimize the reconstruction and verify the tradeoff

For each candidate record: affected requirement/journey; bottleneck evidence; hypothesis; proposed change; predicted metric improvement; correctness/resource tradeoffs; test; and rollback criterion. Prioritize user impact, evidence strength, implementation cost, and risk. Make a focused change so its effect can be assessed.

Re-run the same workloads and relevant behavior tests. Check that cache changes preserve invalidation, batching preserves ordering/durability, and parallelism preserves determinism or documented concurrency guarantees. Confirm the end-to-end benefit and detect regressions in memory, startup, background work, or another important journey. Keep improvements that meet the selected goals; revise or revert unsupported complexity.

Preserve a compact baseline/after-results table and regression thresholds justified by the requirement and measured noise. Mark unavailable or inconclusive comparisons honestly. Continue optimization while a required quality target or a consequential measured bottleneck remains unresolved; do not pursue endless micro-optimizations after the selected goals are met.

## Keep a measured experiment reviewable

Freeze the selected operation, original identity, independent expected results,
fixed small/typical/stress inputs, bottleneck hypothesis and bounded run budget
before optimizing. Preserve the original implementation; never introduce a slow
path to manufacture a demonstration. Separate exploratory/profile runs from final
comparisons and retain raw samples, failures and unsuccessful candidates. Do not
rerun until the result looks favorable. A negative or inconclusive result can
complete the experiment without promoting the candidate.

Time equivalent complete work, consume outputs, and state which setup, I/O,
validation and consumer work is inside the boundary. Record warmup, batch sizes,
order/interleaving, repetitions, runtime flags and material uncontrolled load.
Check exact outputs, errors, state preservation and affected side effects before
performance claims. Recompute summaries from complete samples; report workload
regressions and run disagreement rather than choosing one favorable statistic.
Small batch counts do not justify request-tail percentiles or universal claims.
Keep correctness gates separate from noisy timing; avoid machine-sensitive CI
thresholds. A saved-evidence checker validates selected contracts, not timing
honesty or arbitrary narrative claims.

Name resource metrics precisely: retained heap change is neither peak RSS nor
allocation rate; elapsed time is not CPU time or energy. Collect only metrics
the hypothesis needs. Public evidence should retain portable runtime/workload
identity while omitting private paths, account/hardware identifiers and detailed
host inventory. Keep sensitive provenance privately when necessary.

The [runnable measured optimization example](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/tree/main/evals/measured-optimization)
applies this procedure to an existing reconstruction. Its single-pass validation
candidate passed selected behavior checks but did not demonstrate an overall
speed benefit; the original is retained. This is a same-agent, source-exposed
synthetic observation, not a model benchmark or cross-platform performance claim.
