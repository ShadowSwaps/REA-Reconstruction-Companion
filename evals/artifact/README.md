# Owned managed artifact reconstruction trial

Exactly **key normalization, tiered fees and hex checksum**. This MIT fixture is
source-exposed and authored/reviewed by the same agent, including literal oracles;
it is not blind or independently authored. It exercises a model-independent
procedure without an API/model harness, extra service, package or agent.

The original compiled [Parcel.exe](reference/Parcel.exe) is 5120 bytes, SHA-256
`6f4e7e1d49e03f60adf9deb4929aafbe3fdd6babb628881807c63efb3ee089b4`.
The [identity](identity.json) records compiler/options/runtime/provenance. The
artifact and 30 literal [cases](corpus.json) were frozen at commit `e088524`, then
actual REA findings, [reference observations](observed-reference.json) and the
[contract](CONTRACT.md) were recorded at `0b46aa9` before candidate implementation.
Build source/resource are separately retained in `build-source/`; their author
exposure is disclosed, not erased by excluding them from investigation input.

With **existing Node.js >=20**, run from the repository root:

```sh
node evals/artifact/check.mjs
node --test tests/artifact.test.mjs
node evals/artifact/candidate.mjs fee 4
```

On Windows with existing .NET Framework 4.x, the checker freshly executes the
actual reference and candidate in separate processes, comparing each to the
frozen literals. On Linux/macOS it freshly executes the candidate and rechecks
the retained Windows observations against those literals; the report explicitly
states **historical reference only**. It does not install Mono/.NET, silently
substitute a reference implementation, or claim fresh cross-platform reference
execution. An explicit owned candidate path may be passed to `check.mjs`. Only
run reviewed owned fixtures: bounded subprocesses are not a hostile-code sandbox.

The checker preserves raw stdout/stderr/exit and normalizes only CRLF to LF. It
recomputes checks from raw data and frozen literals, ignoring saved success flags
and stored expected fields. Tests exercise the actual CLI comparison path with
six wrong candidates: wrong key, inert flat-99 fee, lost checksum wrap, wrong
error stream, wrong exit and acceptance of trailing-newline fee input. Tests also
reject missing/duplicate/drifted observations and modified artifact/oracle identity.
Thirty cases do not exhaust the input space or establish global equivalence.

## Repeat the investigation

1. Verify frozen hashes with `verifyFreeze()` in `freeze.mjs`. Copy only the
   executable and selected corpus into an investigation boundary; retain original
   bytes and record actual source exposure. Do not regenerate expected results.
2. Load the installed companion and base REA skills. With a locally connected
   REA exposing the same supported schemas, use `inspect_managed_artifact` with
   the executable's absolute path, then `inspect_managed_members` selecting the
   exact type `Parcel`. Request resource rows through `inspect_analysis_view` if
   needed. This example used the built-in `rea-dotnet-static` provider version 1;
   no disassembler/compiler acquisition or target upload was used.
3. Retain originals privately. The public [REA excerpts](rea-excerpts.json) are
   selected, path-sanitized derivatives with original IDs and explicit limits,
   not new canonical Evidence. CIL strings/calls/anchors support focused
   hypotheses; they are not original C# source. Follow the contract's trace matrix.
4. Probe `fee 1`, `fee 4`, `fee 1000`, `check ff01`, boundary keys and rejection
   cases against the actual binary. `node evals/artifact/observe.mjs` emits fresh
   Windows observations to stdout without overwriting the retained baseline.
   This trial's REA Windows PTY capture failed with `capability_unavailable`
   because descendant cleanup is unsupported. Ordinary Node `spawnSync` runs
   supplied the labeled runtime observations. Preserve that distinction.
5. The inert resource's “flat 99” text is contradicted by active fee behavior.
   Its raw bytes/hash/offset are in the excerpts and match REA's resource row.
   The original fee local-variable name is unavailable from selected artifact
   evidence without debug symbols. Authorship source knowledge cannot be called
   recovery. Runtime tests resolve fee behavior, so it is not permanently unknown.
6. Record the contract and observations before implementing a separate candidate.
   Run the literal checker and wrong-candidate tests. REA's actual typed verifier
   [rejected](verification-rejection.json) using static member Evidence as a
   behavioral comparison. Do not manufacture process/comparison Evidence to
   obtain a pass. The local checker reports its own finite parity result.

To build a **new fixture** with an already installed compatible C# compiler,
use a fresh destination, keeping the distributed reference untouched. In Windows
PowerShell, set `$compiler` to that existing compiler and run:

```powershell
New-Item -ItemType Directory -Path parcel-rebuild
& $compiler /nologo /optimize+ /debug- /target:exe /platform:anycpu /out:parcel-rebuild\Parcel.exe /resource:evals\artifact\build-source\legacy-note.txt,legacy-note.txt evals\artifact\build-source\Parcel.cs
```

Compare behavior using a separately recorded identity. This legacy compiler may
change PE timestamp/MVID on rebuild; byte reproducibility is not claimed. The
preserved original is the acceptance reference. No source was downloaded and no
third-party implementation was copied; repository MIT terms cover this fixture.
