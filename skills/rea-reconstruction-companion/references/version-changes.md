# Adapt to a selected version change

Use this with [checkpoints](checkpoints.md) and, for changed saved data,
[file compatibility](file-compatibility.md). Keep the work scoped to change
detection, selective revalidation and migration/recovery. Ordinary complete-
source work uses normal tools; use REA for applicable artifacts/runtime evidence.

If the request changes only the reconstruction's behavior while the reference stays selected, use [safe changes](safe-changes.md). Do not invent a reference-version transition or force a migration for that edit.

1. Freeze both reference versions, license, artifact identities, relevant
   environment, contracts and representative observations. Separate product
   version from schema and runtime version. Identify a consequential behavior
   change and an unchanged workflow from evidence; changed bytes or version
   labels alone prove neither. Retain historical evidence as historical.
2. Before adapting the saved reconstruction, fix literal acceptance values and
   expected affected/retained sets independently of candidate outputs. Keep
   reference, candidate, oracle and migration design separate. Source-exposed
   same-agent work is not blind or independently authored evidence.
3. Trace evidence → requirement → component → acceptance dependencies, including
   indirect shared interfaces and integration. Check declared edges against a
   trusted source; an omitted dependency cannot justify reuse. Mark dependent
   claims stale or unknown while retaining useful implementation and history.
   An unrun check has no reusable passing result, even with matching identities.
4. Reuse only the exact report scope supported by matching target, candidate,
   corpus, relevant environment and harness identities. Record the original
   report/hash and reason. Reassess changed contracts, adapt the candidate and
   execute affected/shared behavior. Challenge stale reuse, missed dependencies,
   altered history and unnecessary blanket invalidation against the preselected
   expectations. Scoped reuse does not waive required full release regressions.
5. Preserve a selected old-data fixture before migration. Specify supported
   transitions, defaults and representability; reject destructive/unsupported
   downgrades. Check literal values and appropriate old/new readers beyond
   round trips. Inspect opening, explicit migration, late validation, persistence
   failure, retry and restart. State whether backup/recovery is a tested harness
   arrangement or a product feature, and identify the actual commit boundary.
6. Separate injected failures, controlled real OS faults and spontaneous runtime
   observations. Retain old data and failed attempts. Report exactly which
   pathname/bytes and memory survived; a harness that moves the old file does
   not prove that the active path stayed unchanged. Caught errors and rename
   do not prove power-loss, transaction, crash, concurrency or hostile-path safety.

The repository-only
[version-change example](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/tree/main/evals/version-change)
reuses the Pocket Ledger codecs and resume evaluator. Its frozen literal oracle,
dependency map, two-process checkpoint continuation and bounded migration faults
demonstrate the procedure; they do not infer arbitrary dependency graphs or
establish compatibility with an external application or another host.
