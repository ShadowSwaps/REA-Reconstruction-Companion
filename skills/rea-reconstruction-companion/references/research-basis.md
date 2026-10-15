# Research basis and limits

Reviewed 2026-10-15. These primary papers and official/author-maintained sources informed the skill revisions. The procedures are a synthesis adapted to REA-assisted product reconstruction; the sources do not certify this skill or demonstrate that every method fits every app. Consult relevant sections when reviewing or extending a method, rather than loading this bibliography during every task.

## R1 Architecture reconstruction

Kazman, O'Brien, and Verhoef, [Architecture Reconstruction Guidelines, Third Edition](https://www.sei.cmu.edu/documents/695/2003_005_001_14081.pdf), SEI, 2003. Reviewed reconstruction recommendations, information extraction, view fusion, and architectural view composition.

Applied: question-led investigation, architectural hypotheses, separate static/runtime views, and reconciliation across identities. Limitation: the report's tooling and access to original developers are not assumed available here; recovered views remain bounded by the evidence.

## R2 Feature location

Eisenbarth, Koschke, and Simon, [Locating Features in Source Code](https://www.researchgate.net/publication/3188312_Locating_features_in_source_code), IEEE TSE, 2003, DOI 10.1109/TSE.2003.1183929. Reviewed the abstract and author-uploaded method material.

Applied: scenario-driven feature-to-code mapping with static and dynamic evidence, and recognition that features and code units have many-to-many relationships. Limitation: this skill uses that principle; it does not claim to implement the paper's formal-concept-analysis algorithm.

## R3 Decompiler assumptions

Ghidra, [Improving Disassembly and Decompilation](https://ghidra.re/ghidra_docs/GhidraClass/Advanced/improvingDisassemblyAndDecompilation.pdf). Reviewed analysis assumptions, function boundaries, data types, call signatures, and mutability examples.

Applied: check recovered-code assumptions before depending on pseudocode; retain corrections and uncertainty. Limitation: specific Ghidra controls are not universal REA provider APIs, and recovered pseudocode is not the original source.

## R4 Reproducible artifacts

ACM CCS 2025, [Call for Artifacts: Evaluation Criteria](https://sigsac.hosting.acm.org/ccs/CCS2025/call-for-artifacts/).

Applied: preserve inputs, runnable/repeatable steps, outputs, and context sufficient to examine a claim. Limitation: the compact scenario record is our engineering adaptation; no ACM evaluation, badge, publication, or public upload is implied.

## R5 Differential testing

McKeeman, [Differential Testing for Software](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf), Digital Technical Journal 10(1), 1998. Reviewed oracle selection, comparative testing, false positives, test quality, and reduction.

Applied: compare equivalent cases, investigate mismatches, minimize failures, and retain regression fixtures. Limitation: agreement does not prove correctness; differing results may both be permitted. Comparing a rebuild to a reference establishes only the exercised behavior under the declared conditions.

## R6 Metamorphic testing

Chen, Cheung, and Yiu, [Metamorphic Testing: A New Approach for Generating Next Test Cases](https://arxiv.org/abs/2002.12543), technical report HKUST-CS98-01, archived on arXiv in 2020. Reviewed the paper's treatment of relationships between executions and absent exact-result oracles.

Applied: use justified relations between related inputs/outputs when exact expected values are unavailable. Limitation: relation validity is domain-dependent; passing these tests does not establish reference parity.

## R7 State models

[Hypothesis stateful testing documentation](https://hypothesis.readthedocs.io/en/latest/stateful.html) and the [LearnLib project documentation](https://learnlib.de/). Reviewed action-sequence generation, comparison with a model, failure examples, and bounded equivalence strategies.

Applied: explicit state/transition models, sequence tests, resets, and refinement from counterexamples. Limitation: finite exploration is bounded; neither library is required or installed by this skill. A proposed model must not be mistaken for a recovered original specification.

## R8 Combinatorial coverage

NIST, [SP 800-142: Practical Combinatorial Testing](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-142.pdf). Reviewed interaction coverage, practical constraints, and tradeoffs.

Applied: use constrained combinations for large relevant configuration spaces and report the selected coverage. Limitation: no fixed interaction strength guarantees completeness for an arbitrary product, and configuration combinations do not replace state-sequence tests.

## R9 Visual baselines

Playwright, [Visual Comparisons](https://playwright.dev/docs/test-snapshots). Reviewed snapshot baselines and environment-dependent rendering.

Applied: consistent comparison environments and explicit tolerances/masks. Limitation: screenshots validate presentation only; visual similarity alone cannot establish correct interaction or persistence. This is platform-neutral guidance, not a Playwright dependency.

## R10 Resource bottlenecks

Brendan Gregg, [The USE Method](https://www.brendangregg.com/usemethod.html). Reviewed resource inventories, utilization, saturation, errors, and interpretation limits.

Applied: attribute poor performance using resource evidence rather than guessing from average CPU or elapsed time. Limitation: this method does not solve every latency or application-logic problem, and counters must fit the actual resource and environment.

## R11 Benchmark controls

Google Benchmark, [User Guide](https://google.github.io/benchmark/user_guide.html). Reviewed warmup, repetitions/statistics, random interleaving, and memory measurements.

Applied: separate cold/warm behavior, repeat measurements, retain variation/context, and control drift. Limitation: these principles extend beyond C++ microbenchmarks, but that extension is our workflow choice; microbenchmark gains do not automatically improve user journeys.

## R12 Electron performance

Electron, [Performance](https://www.electronjs.org/docs/latest/tutorial/performance). Reviewed measurement-first guidance, startup work, main/renderer blocking, I/O/IPC, and network overhead.

Applied: investigate those mechanisms when the target is Electron and measurements implicate them. Limitation: following a checklist does not guarantee performance; do not apply Electron-specific advice to unrelated platforms or copy architectural choices without a workload-based reason.

## R13 Platform profiling

Microsoft, [Tools for Profiling and Performance](https://learn.microsoft.com/en-us/windows/apps/develop/performance/profiling-tools). Reviewed application/runtime and system-level profiler selection, including WPR/WPA.

Applied: use the appropriate profiler alongside REA when the required measurement is outside REA's capabilities. Limitation: availability and permissions are environment-specific; no software installation or system configuration change is authorized by this reference.

## R14 Web performance

Google Chrome/web.dev, [Web Vitals](https://web.dev/articles/vitals). Reviewed user-centric measures and the distinction between lab and field observations.

Applied: choose relevant loading/interaction/layout measures for web interfaces and label lab proxies accurately. Limitation: lab results do not establish a deployed user population's performance, and web metrics are not universal native-app quality measures.

## Scope of the synthesis

Evidence-dependency tracking, compatibility corpus design, held-out reference cases, and explicit optimization decision records are workflow recommendations combining these sources with the installed REA skill. They are not named capabilities guaranteed by the REA server. Inspect current schemas when invoking tools.

Keep research directed by the target and uncertainty: use current primary platform documentation for concrete implementation choices, and investigate a technique only when it could improve a selected outcome. This skill does not require exhaustive formal verification, reproducing the original's defects, recovering inaccessible server internals, or installing every referenced tool.
