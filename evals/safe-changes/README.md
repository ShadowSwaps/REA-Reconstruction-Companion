# Worked safe change to an existing reconstruction

This source-exposed, same-agent teaching fixture extends the existing Pocket
Ledger reconstruction with `setDone(id, boolean)`. The selected reference version
stays fixed. The [contract](CONTRACT.md), literal expectations, manually assessed
dependency map and custom baseline were frozen before the separate variant.
Historical import/export and version-change examples remain unchanged.

From the repository/release package root, with existing Node.js 20+ and no npm
dependencies, choose a **new, nonexistent directory under an owned scratch parent**:

```sh
node evals/safe-changes/run.mjs ./safe-change-trial
node --test tests/safe-changes.test.mjs
```

The first command is a batch process: exit 0 and `selected-change-passed` mean
the listed assertions ran. Exit 2 reports a failed invocation/assertion. Reusing
the same directory fails; keep its original contents and select a new name for
another attempt. No service, port, accounts or shutdown command is needed.
The second command runs the trial plus six intentionally faulty factory variants
against the actual assertions, using separate OS temporary directories.

Walkthrough: the runner writes synthetic schema1 rows “Café 🧾” and “Second”.
Opening leaves those bytes intact. No-op and invalid edits do not save. An
injected pre-rename exception preserves memory and the file; retry sets only
`a.done=true`, retains title listing, rejects lossy schema1 export, and reopens in
a fresh Node process with the literal rows. Clearing completion allows schema1
export again. It also checks old/new imports, late invalid import and explicit
migrate. `active.json` is the evolving state; `prior-data.json` is the unchanged
disposable pre-edit copy; `restored.json` demonstrates explicit restoration in a
separate file. That restore loses later completion intentionally. The previous
implementation can read the new schema2 state without restoring old data.

These are actual local Node/library/file observations; persistence failure is
injected, not spontaneous disk denial. The previous version-change OS fault
results are historical. No real user data/app is changed, no forced schema
migration or product backup manager is added. Keep the owned directory as evidence;
if cleaning later, verify its resolved location/ownership and preserve unknown
files first. Do not apply these fixtures as a reset procedure for real data.

See [observations and manual contextual cases](OBSERVED.md). This runnable
example does not evaluate arbitrary natural-language understanding, infer
dependencies automatically, test another machine or guarantee transactions,
concurrency, crash durability or global compatibility.
