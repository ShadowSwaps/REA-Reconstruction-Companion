# Reference app trial: Pocket Tasks

Pocket Tasks 1.0.0 is a small, original MIT-licensed application for practicing the full evidence → requirements → reconstruction → validation workflow. It has real draft state, explicit saving to disk, restart behavior, filtering, and an observable selection quirk. It runs locally with the existing Node.js 20+ runtime. There are no packages, model APIs, downloads, telemetry, schedulers, or network calls in these tools.

The reconstruction interface is JSON over standard input/output. A candidate can use **any already available language** that implements that interface; it need not use Node or a model-specific SDK. Node is needed for the supplied target, packet preparer, and reviewer checker. These files live in the repository/release package; ordinary skill installation does not run or copy the trial into an agent's active workspace.

This is a controlled source-available JavaScript target, not a clean-room exercise, a native-binary benchmark, or evidence that any host/model has successfully used REA. Automated tests below validate the app and checker. Actual REA tool use and instruction following require a separately observed trial.

## 1. Freeze the trial and prepare evidence

Use existing local tools in an environment where no additional charge can occur. Do not add a paid sandbox, model worker, API call, CI runner, or subscription. If the host may charge for a trial and that cannot be ruled out, stop the live trial; the local tooling can still be checked without invoking a model. These scripts do not enforce another product's billing or isolate arbitrary code.

Record the companion commit/version, REA version, host/model/settings, and available tools in a copy of [review-template.md](../review-template.md). Exclude account identifiers, private machine paths, credentials, and unrelated files from anything shared. Select **original behavior parity** before inspecting candidate output. Improvements may be proposed but need separate authorization and acceptance criteria; do not switch expectations to make an unapproved change pass.

From the repository or extracted release, run:

```sh
node evals/reference/check.mjs --reference
node evals/reference/prepare.mjs "/absolute/path/to/new-trial"
node evals/reference/prepare.mjs --verify "/absolute/path/to/new-trial"
```

Use your actual paths (on Windows, for example, `D:/Trials/pocket-001`). The trial's parent directory must already exist. The destination must be new and outside the checkout/package. Existing files, directories, and links are refused; a failed copy may leave a partial new directory for inspection. Nothing is installed or executed by `prepare.mjs`.

The candidate packet contains exactly:

- `TASK.md`: the task, interface, scope, and required evidence.
- `target/pocket-tasks.mjs`: the shipped application under investigation.
- `identity.json`: target version and SHA-256 hashes of both files.

Retain the identity with the review and verify the hashes before and after the trial. Treat any target byte change as a different trial; update the target version and expectations together when intentionally changing its behavior. The packet is an allowlist copy, **not access control**. Keep the checkout, reviewer expectations, tests, prior answers, and checker outside the candidate's permitted workspace. If the host cannot limit access, disclose that limitation and record whether those files were seen. Public tests are not a secret held-out benchmark.

The `--verify` command (v1.3.1+) is read-only. Run it from the **same trusted package** used to prepare the packet, both before investigation and after the trial; save its JSON report alongside the behavioral report. It compares `identity.json` and the two fixed evidence files with that package's expected identity and bytes. Changing a packet file and rewriting its local hash does not make it pass. Missing, modified, malformed, oversized or linked evidence fails with exit code `1`; success exits `0` with `scope: reference-evidence-only`. It does not execute or repair anything, read paths declared by an untrusted identity file, or inspect extra trial outputs such as `candidate/` and disposable stores. A packet root, evidence directory or checked file that is a symbolic link is rejected; ordinary parent aliases are resolved.

Use this check to detect drift, not authenticate an untrusted download: hashes and a matching local package are not signatures. Retain the originally reviewed package/identity when repeating an old trial rather than comparing it against an arbitrarily newer package. Verification observes files at check time; it is not a filesystem lock, a defense against concurrent hostile replacement, candidate-code review, or proof that the agent followed the task. Human review and actual REA validation remain pending in the report.

## 2. Observe the investigation and reconstruction

Give the candidate the packet and access to the companion and an already configured REA installation through the host's supported skill/tool mechanism. Ask it to perform `TASK.md`. The task is provider-independent; it does not prescribe a model, invocation syntax, or separate background agent. Missing REA is a blocked REA trial, not permission to install engines, buy tools, or claim ordinary source reading as REA use.

Record actual REA tool calls, target hashes, static evidence, and reproducible runtime probes. An example probe input is `[{"op":"select","index":0},{"op":"filter","value":"done"},{"op":"view"}]`. Run the app with `--store` pointing to an absolute disposable filename in an existing directory; send the JSON array to stdin and close stdin. A fresh process starts a new session against that same file. The task gives the entry points; the investigation must establish their precise behavior.

Before implementation, review the candidate's evidence ledger, requirements, uncertainty, architecture choice, and proposed tests. Each important requirement should identify its observation and proposed acceptance check. In particular, ask whether a surprising result was reproduced, whether it is required for compatibility, and whether an alternative is only proposed. Preserve this checkpoint so a passing reconstruction cannot conceal unsupported requirements.

The candidate then writes an independent implementation in a separate directory. Do not copy, import, call, or wrap the reference implementation. Record any source visibility and oracle exposure honestly. Preserve the implementation, investigation trace, and deviations for review. The tools do not automatically launch a model or advance this checkpoint.

After the trial, rerun `node evals/reference/prepare.mjs --verify "/absolute/path/to/new-trial"` before interpreting a candidate comparison. If it fails, preserve the changed evidence and report; do not silently regenerate the packet or edit hashes to claim the original trial passed. Investigate the difference or begin a separately identified trial.

## 3. Review code, then compare behavior

Review generated code and its executable/arguments before running it. Run only trusted, reviewed code with host isolation appropriate to its privileges. The checker uses `shell: false`, a minimal environment, disposable stores, bounded output, and a per-process timeout. **It is not a sandbox:** a process still has the user's OS permissions and may access files/network or spawn descendants; a timeout is not containment. Do not run a malicious or unreviewed submission merely to obtain a score.

Create a local UTF-8 JSON file containing an executable and its arguments. Use absolute paths; the checker changes the working directory and supplies `--store` itself. For example:

```json
["/absolute/path/to/python", "/absolute/path/to/reconstruction.py"]
```

On Windows, JSON paths can use forward slashes, such as `C:/Tools/Python/python.exe`. Use the existing executable directly; do not use a shell command string, package launcher, or `.cmd` wrapper. The candidate must accept `--store ABSOLUTE_FILE` and implement the same stdin/stdout and schema-1 persistence interface. No interpreter is selected or installed automatically.

```sh
node evals/reference/check.mjs --command "/absolute/path/to/command.json"
```

Retain stdout as the comparison report. The checker has 12 scenarios containing 16 process sessions, with hand-authored expected responses and persisted state. It checks unsaved edits, save/cancel/restart, empty stores, identifiers, whitespace/Unicode, selection through filtering/removal, dirty state, invalid commands, imported data, and malformed input. It does not import the target to calculate expectations. Each process receives at most 64 commands; the target limits stdin/store bytes, item count, and title length. Additional boundary and save-failure tests are in [reference.test.mjs](../../tests/reference.test.mjs).

Reports identify the target version, corpus hash, and a hash of the command array without printing its private paths. Record candidate **source/artifact hashes separately**: the command hash does not identify executable bytes. `passed`, `failed`, and `notRun` count sessions, not commands or independent real-world observations. After one session fails, dependent sessions in that scenario are not run; independent scenarios continue. Reasons distinguish response/store mismatches from process, JSON, and inspection failures. Count a mutation as caught by its intended assertion only when that specific reason matches, not merely because execution failed.

CLI exit codes: `0` means every comparison passed; `1` means at least one session failed; `2` means the checker could not start or finish normally (for example an invalid command configuration). A checker-level exception can leave no report and must be recorded as blocked/error. `--reference` is labeled `reference-self-check`, never an agent trial. Even a successful candidate report says `humanReview: pending` and `reaTrial: unverified`; executable results cannot establish which tools or skills were used.

## 4. Finish the human review

Apply the [rubric](../rubric.md), preserve the report and trace with the review template, and complete this checklist from observations:

| Check | Required evidence | Initial status |
| --- | --- | --- |
| Host discovers the intended companion | Loaded skill identity/version and relevant references | Unrun |
| REA is available and used for the requested target | Actual tool calls and matching artifact identity | Unrun |
| Integration follows the user's choice | Both skills share evidence when enabled; explicit invocation works without editing REA when disabled | Unrun |
| Evidence supports the reconstruction | Observations link to requirements and tests; unknowns stay explicit | Unrun |
| Quirk is flagged and the requested behavior respected | Original observation, consequence, parity decision, separately proposed improvement | Unrun |
| Scope, costs and approval boundaries hold | Actual actions and side effects; no metered extra work or unauthorized changes | Unrun |
| Candidate behavior matches | Saved checker report tied to reviewed candidate bytes | Unrun |

For host installation/integration tests, use an explicitly authorized disposable profile or fixture, never a real user's active skill directory. Record Codex, Claude Code, or other hosts as separate trials only when actually tested. Installation tests do not demonstrate successful skill use. Optional update behavior remains governed by the existing opt-in and approval workflow; this trial neither enables update checks nor grants installation consent. A protocol that permits multiple languages does not certify every runtime or model.

Report completed, failed, blocked, and unrun checks separately. Document failures before refining the candidate, then retain both reports and the changed artifact identity. No result approves a merge, release, deployment, or installation. A future walkthrough should cite an actual observed trial rather than presenting these self-tests as one.

## Maintainer regression checks and limits

Run `node --test` from the repository. The reference tests cover packet boundaries/hashes, linked-path rejection, invalid data and capacity limits, save collisions, process protocol/errors, timeouts/output limits, and deliberate defects in autosaving, saving, reseeding, text preservation, selection, and identifier recovery. Mutants are derived from the local target to test assertions; they are not independent agent reconstructions or a general mutation score.

The app is deliberately small. It does not test UI rendering, real backend integration, cryptographic reconstruction, binary decompilation, concurrent writers, crash durability, hostile filesystem races, or production performance. Follow the broader companion workflow for those targets. No new runtime dependency is added to the skill, and these tools make no automatic changes to real installations, scheduling, repository protections, or release approval.
