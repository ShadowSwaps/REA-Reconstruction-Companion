# Run the Pocket Tasks reconstruction

This is a batch command example, with local JSON storage and no UI or remote
service. The tested walkthrough uses existing Node.js 20+ and Windows PowerShell
5.1+ (also suitable for PowerShell 7). Check `node --version` and
`$PSVersionTable.PSVersion` first. If Node is missing/older, stop and arrange an
approved runtime or use an already supported environment; these steps install
nothing. Other shells need their own quoting/pipeline adaptation and are not
demonstrated by this walkthrough.

Review `candidate.mjs` before execution. Create a new ordinary writable folder
you own, without directory links, and copy **only `candidate.mjs` and this
`RUN.md`** into it from this reconstruction directory. Open PowerShell **in that
new folder**. No npm packages, checkout, checker, fixtures, environment variables,
accounts or REA session are needed. Do not use a real task store.

## Set up and save/reopen

Run each block in order in that same PowerShell session. Stop if a command fails
or an expected result differs; preserve the files for inspection. These names are
reserved for this new walkthrough folder; creation fails rather than reuses a
previous run's `data` folder. Keep it if repeating and start in another new folder.

```powershell
$ErrorActionPreference = 'Stop'
node --version
if ($LASTEXITCODE -ne 0) { throw 'Node is unavailable.' }
node candidate.mjs --help
New-Item -ItemType Directory -Path './data' -ErrorAction Stop | Out-Null
$data = (Resolve-Path -LiteralPath './data').Path
$store = Join-Path $data 'tasks.json'
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Startup failed; inspect the path and Node version.' }
```

A missing store shows seed rows Alpha, Beta and Gamma; it is not an empty list
and no file is created until save. Each invocation takes **one JSON array** on
stdin; the pipeline closes stdin automatically. It emits one response per action
in a JSON array, then exits. There is no server/port to stop. With direct keyboard
input it waits for EOF (Ctrl+Z then Enter in Windows PowerShell); prefer pipelines.
Ctrl+C interrupts only this invocation; unsaved drafts are lost, and interruption
during save has no recovery guarantee. Do not stop another Node process.

```powershell
'[{"op":"add","title":"Walkthrough"},{"op":"save"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Save process failed.' }
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Reopen failed.' }
Get-Content -LiteralPath $store
```

Expect four rows, the last `t4` titled `Walkthrough`, and `dirty:false` after
save and on reopen. The file holds schema 1, items and nextId; selection/filter
are transient. Draft changes persist only with explicit save. `ok:false` in an
action is a failure **even when the process exits 0**. Startup/invalid batch input
exits 2 with a generic diagnostic; inspect the JSON, absolute path, existing parent
directory and absence of links. `--help` does not diagnose every cause.

## Cancel and expected errors

```powershell
'[{"op":"add","title":"Unsaved"},{"op":"cancel"},{"op":"unknown"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Cancel/error walkthrough could not run.' }
```

Expect dirty true with five rows, then dirty false with the original four, then
`ok:false,error:"unknown-op"` with those four unchanged. Cancel restores the last
saved document within a batch; exiting also discards drafts. Check returned
selection before rename/toggle/remove: the preserved original behavior selects a
visible row position, so filtering/removal can retarget the selection.

## Rejected save and recovery

This deliberately creates a pending-file collision owned by this walkthrough.
The code refuses to overwrite it. Never remove or move an unexplained pending
file from a real store; preserve it and investigate ownership first.

```powershell
$pending = $store + '.pending'
New-Item -ItemType File -Path $pending -Value 'owned walkthrough collision' -ErrorAction Stop | Out-Null
'[{"op":"add","title":"Retry"},{"op":"save"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Collision walkthrough could not run.' }
Get-Content -LiteralPath $pending
Get-Content -LiteralPath $store
Move-Item -LiteralPath $pending -Destination (Join-Path $data 'collision-kept.txt') -ErrorAction Stop
'[{"op":"add","title":"Retry"},{"op":"save"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Retry process failed.' }
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Retry reopen failed.' }
```

Failed save returns `save-failed`, retains the five-row draft in that response
and leaves prior four-row file bytes and pending marker intact. A new invocation
starts from disk, so retry explicitly repeats the lost unsaved add. After moving
the known collision aside, expect five saved rows, last `t5` titled `Retry`,
dirty false on reopen. No assertion of crash safety or concurrent-writer safety.

## Backup, malformed store, reversible reset

All processes above have exited. Before proceeding, inspect `$data` and `$store`
and confirm they resolve to this walkthrough's ordinary owned folder/files, with
no links or other writer. The guard below requires all backup names to be unused;
do not bypass it or add `-Force`. For valuable data use a separately verified backup;
this deliberate corruption is only for the disposable walkthrough store.

```powershell
$data
$store
Get-ChildItem -LiteralPath $data | Select-Object Name, Attributes
foreach ($name in @('before-error.json', 'malformed-kept.json', 'before-reset.json', 'empty-kept.json')) {
    if (Test-Path -LiteralPath (Join-Path $data $name)) { throw "Preserve existing $name; start in a fresh folder." }
}
Copy-Item -LiteralPath $store -Destination (Join-Path $data 'before-error.json') -ErrorAction Stop
[IO.File]::WriteAllText($store, '{broken')
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 2) { throw 'Expected malformed-store process exit 2.' }
Get-Content -LiteralPath $store
Move-Item -LiteralPath $store -Destination (Join-Path $data 'malformed-kept.json') -ErrorAction Stop
Copy-Item -LiteralPath (Join-Path $data 'before-error.json') -Destination $store -ErrorAction Stop
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Restored store could not reopen.' }
Move-Item -LiteralPath $store -Destination (Join-Path $data 'before-reset.json') -ErrorAction Stop
[IO.File]::WriteAllText($store, '{"schema":1,"items":[],"nextId":1}')
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Empty-store reset failed.' }
Move-Item -LiteralPath $store -Destination (Join-Path $data 'empty-kept.json') -ErrorAction Stop
Copy-Item -LiteralPath (Join-Path $data 'before-reset.json') -Destination $store -ErrorAction Stop
'[{"op":"view"}]' | node candidate.mjs --store $store
if ($LASTEXITCODE -ne 0) { throw 'Reset recovery failed.' }
```

Malformed input stays `{broken}`; it is rejected, never silently reset. Restoring
the backup returns five rows. Explicit schema-1 empty data returns zero rows;
removing the file instead would bring back seeds. Final recovery returns the same
five saved rows. Backups/collision/malformed/empty files remain for inspection.
No cleanup deletion is needed. Do not copy these reset steps onto real user data.

## What this demonstrates

The maintained candidate supports the selected local workflows; its historical
reference comparisons and limits remain in the reconstruction README. This guide
was exercised from a fresh directory by the same source-exposed agent on an
existing Windows/Node environment. That is not a clean OS/runtime installation,
an independent beginner/model test or a new reference investigation. Local JSON
storage is working example behavior, not remote synchronization. There is no
finite replay or remote adapter here; remote integration and UI are unimplemented,
and crash durability/concurrent writers remain unverified. No whole-app/global
parity, production readiness or measured usability/time savings are claimed.
