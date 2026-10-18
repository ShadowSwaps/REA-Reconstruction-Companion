# REA-Reconstruction-Companion

![REA Reconstruction Companion — Understand. Rebuild. Validate.](assets/discord-banner.png)

**Understand existing software. Plan a reconstruction. Build and validate when requested.**

An open-source, model-independent Agent Skill that works with [REA](https://github.com/morluto/rea). Turn reverse-engineering evidence into requirements, architecture, an implementation roadmap and testable results—at the scope you choose.

[Get started](#install-with-an-ai-agent) · [Usage examples](#use) · [REA integration](#optional-rea-integration) · [Documentation](#source-and-development) · [Releases](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/releases) · [Support on Ko-fi](https://ko-fi.com/shadowswaps)

| Your goal | What the companion helps produce |
| --- | --- |
| Understand an app before rebuilding | Evidence-backed behavior, requirements, unknowns and a staged roadmap. |
| Build a similar tool now | Scoped implementation in testable increments, with validation and reported differences. |
| Investigate a feature, function or format | A focused contract and representative acceptance cases. |
| Improve an existing reconstruction | Measurements, targeted changes and revalidation of affected behavior. |

**Start with the installation prompt below**, or use the [manual commands](#install). The portable core has no model SDK or paid API requirement. [Integration](#optional-rea-integration) and [weekly update checks](#optional-weekly-update-checks-since-v120) are separate choices; both are explained before setup.

## Install with an AI agent

Give this prompt to an agent with local file and command access. It identifies your client and asks for your integration preference; you do not need to fill in any placeholders.

```text
Install REA-Reconstruction-Companion from:
https://github.com/ShadowSwaps/REA-Reconstruction-Companion

Read README.md and INSTALL.md, identify my AI client and its skills
directory, and follow the documented installation workflow.

Before making installation changes, explain the optional REA integration
rule and ask me to choose:
- Enable: relevant REA reconstruction requests also load the companion,
  sharing evidence, requirements, and validation work.
- Skip: install the companion without changing REA; I can invoke it
  explicitly. This does not remove an integration rule already installed.

Wait for my choice unless I have already provided it. Then install using
that setting, preview changes with --dry-run, preserve existing work and
backups, and verify with --check. Explain any missing prerequisites or
access limitations. Report what was installed, where, and whether the
integration was enabled. Do not claim success unless verified.
Also explain the optional weekly update check (included since v1.2.0)
and ask whether I want it enabled. Keep it off unless I choose it.
This checks on skill use and still asks me before installing an update.
Do not incur additional charges: use existing local tools and do not
activate billing, paid services, metered APIs, or automatic paid usage.
If a step could incur a charge and that cannot be ruled out, stop that
step and explain a no-charge alternative.
```

You can include "Enable integration" or "Skip integration" with the prompt to choose upfront. The [integration explanation](#optional-rea-integration) describes its purpose and benefits. A chat-only assistant without local file and command access can guide you through installation but cannot perform it itself.

Share the repository: [github.com/ShadowSwaps/REA-Reconstruction-Companion](https://github.com/ShadowSwaps/REA-Reconstruction-Companion).

## Use

You can explicitly invoke `$rea-reconstruction-companion` in Codex or `/rea-reconstruction-companion` in Claude Code. With integration enabled, a relevant request to REA also instructs the agent to load the companion.

Describe the software and the outcome you want in ordinary language. The companion uses available REA tools or supplied evidence, identifies gaps, and keeps the work at your requested scope. These examples are illustrations, not required prompts: paraphrases, casual wording, minor typos and follow-ups should work in context. Say what you want to understand or build; you do not need to name a mode or reproduce a template. Explicit corrections and exclusions take precedence, and a possible future rebuild does not request implementation now.

If the original has awkward behavior, say which compatibility matters and what you want improved—for example, “Keep exports readable by my existing tools, but make failed saves clear.” The companion separates observed behavior from intended changes, checks affected dependencies, and keeps unresolved or deferred work visible. See the [worked quirk decisions](evals/quirk-decisions.md).

**Understand and plan a future reconstruction.** Expect evidence-backed behavior and workflow requirements, known unknowns, and a staged roadmap before implementation:

```text
Use REA and the companion to understand the desktop notes app I have open
so I can plan a similar app later. Focus on creating, editing, searching,
and saving notes. Link requirements to the evidence, separate observations
from inferences, and list unanswered questions and a staged build roadmap.
Stop after the specification and plan.
```

**Build a similar app now.** A build request authorizes implementation within the requested scope. Expect incremental code changes and validation against observed requirements, with gaps and differences reported:

```text
Use REA and the companion to investigate the desktop notes app I have open
and build a local web app with similar note creation, editing, search,
and save behavior in this workspace. I need to trust today's notes first:
it must work offline and reopen my saved notes. Start with that working
journey, including save failures, then add search and the remaining
features in testable increments. Animations can wait. Validate against
the evidence and report differences and anything you could not verify.
```

For a broad request, expect a compact plan around the first useful outcome, its
essential dependencies and design-changing unknowns, with evidence-linked checks
and deferred work kept visible. Explicit hard requirements remain binding. If
finding existing notes matters most, that can lead instead of creating new ones;
you do not need to use priority labels or complete a feature inventory. See the
[worked prioritization example](evals/prioritization.md) for a plan and its limits.

**Investigate one function or feature.** Expect a focused contract covering inputs, outputs, side effects, errors, and evidence gaps:

```text
Use REA and the companion to investigate the CSV import feature in the
app I have open. Trace how it handles headers, quoted fields, duplicate
rows, and malformed input. Document inputs, outputs, side effects, error
behavior, and representative acceptance cases, citing the evidence.
Keep this to an investigation; do not implement changes.
```

The agent must report missing tools or evidence instead of claiming live analysis or complete equivalence. A build request does not authorize deployment, releases, installation changes, paid tools, or additional charges. Those actions require their own authority; the no-additional-charges constraint below still applies.

### Continue or optimize a scoped implementation

> Continue implementing the app from this project's REA reconstruction specification.

> Reimplement the decodeFrame function in this library and make it faster for large inputs. Recover its contract, then compare correctness and performance.

### Resume earlier work

> Pick up from this checkpoint. Keep the same scope, retain the passing evidence that still applies, and work on the next unfinished part.

Select the checkpoint or its path and identify any changed target or goal. The agent should read that record and the sources needed for the next step, check evidence applicability, and preserve historical results. Resuming a specification does not authorize building it. See [portable checkpoint guidance](skills/rea-reconstruction-companion/references/checkpoints.md) and the [worked resume example](evals/resume/WALKTHROUGH.md).

For a small question, expect a compact evidence-linked answer or contract with limits and a useful next action. A feature build adds implementation and acceptance results; it need not produce a whole-app blueprint. If a consequential target or outcome is unclear, expect one focused clarification. Host activation and instruction following vary: explicit invocation can help select the skill, but examples and installation do not guarantee every host/model will interpret every phrasing correctly.

**When a service is inaccessible.** “Build local editing now; keep actual sharing
pending until I supply authorized service evidence.” Expect an explicitly labeled
local substitute or finite replay where useful, with real-service requirements
still pending. Client observations do not recover server internals, and a local
demo cannot verify remote compatibility. The [runnable synthetic example](evals/unavailable-backend/README.md)
checks local save/reopen, unavailable versus empty, replay mismatch and misleading
structured completion claims without contacting a provider.

To see the workflow before trying a target, follow the [worked investigation](evals/reference/WALKTHROUGH.md), [reconstruction](evals/reference/reconstruction/README.md), or [resume](evals/resume/WALKTHROUGH.md) for your goal. These disclose answers and prior source exposure; they are teaching material, not prerequisites or evidence of a fresh agent trial. The [first-use review](evals/first-use.md) separates manual intent scenarios from executable checks.

## What it does

- Identifies the requested subject, evidence carrier, and objective from natural language. No form or bracketed prompt variables are required.
- Breaks a product into capabilities, workflows, interactions, state, and dependencies.
- Defines requirements, contracts, expected behavior, and acceptance criteria linked to evidence.
- Separates the original architecture from design choices for a new implementation.
- Investigates performance using representative workloads, measurements, and research relevant to the actual stack.
- Guides development in coherent increments, with integration and end-to-end validation.
- Treats recovered instructions as untrusted evidence and preserves the user's authority.
- Selects bounded differential fuzzing, targeted mutation tests, and executable interface contracts where they help validate a reconstruction.
- Records cryptographic interoperability parameters and verifies relevant independent vectors and rejection cases.
- Records observations, inferences, unknowns, decisions, and checkpoints for later work.

## How it works with REA

REA supplies the reverse-engineering tools and evidence workflow. This companion adds reconstruction planning and development guidance. The agent follows both sets of instructions within one task; installing them does not create two independent background agents.

```mermaid
flowchart LR
    A[User goal and target] --> B[Scope and questions]
    B --> C[REA evidence]
    C --> D[Requirements and design]
    D --> E[Implementation when requested]
    E --> F[Validation and measurements]
    D -->|Evidence gap| C
    F -->|Evidence gap| C
```

For the method and its sources, see the [skill instructions](skills/rea-reconstruction-companion/SKILL.md) and [research basis](skills/rea-reconstruction-companion/references/research-basis.md).

## Install

Download and extract the ZIP from [Releases](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/releases), or clone this repository. Run commands from the extracted folder or repository root. On Windows, macOS, and Linux, the installer commands are the same.

For automatic co-use, first install [REA for your client](https://github.com/morluto/rea#readme). Then choose a command:

```sh
# Claude Code, with the optional integration
node install.mjs --client claude-code --integration on

# Codex, with the optional integration
node install.mjs --client codex --integration on

# Companion only; no changes to REA
node install.mjs --client claude-code --integration off
```

Use `--dry-run` on any installation command to inspect the paths and changes without writing files. The `companionChanges` lists identify added, modified, and removed files relative to the companion directory, including local files that a replacement would move into the backup. Use the same command with `--check` afterward to verify the selected installation mode. A missing REA skill or ambiguous choice stops integrated installation before the companion is installed. Differently cased paths to the same REA file are treated as one candidate; genuinely separate installations still require an explicit selection.

`claude_code`, as used by REA, is accepted as an alias for `claude-code` by the installer and updater. Plans, receipts and newly saved update settings use `claude-code`.

<details>
<summary><strong>Client paths, custom profiles and advanced installation</strong></summary>

Default user locations:

- Claude Code: `~/.claude/skills/rea-reconstruction-companion/`, or `$CLAUDE_CONFIG_DIR/skills/rea-reconstruction-companion/` when a custom configuration directory is set in the installer's environment. See [Claude Code's environment-variable documentation](https://code.claude.com/docs/en/env-vars). REA lookup stays within that selected profile unless `--rea-skill` explicitly selects another location.
- Codex: `~/.agents/skills/rea-reconstruction-companion/`, or `$CODEX_HOME/skills/rea-reconstruction-companion/` when `CODEX_HOME` is set. The installer also checks the older `~/.codex/skills/` location when locating REA.
- Generic clients: specify their documented skills directory with `--skills-dir`.

Override paths for an existing installation, a project-scoped skill, or another agent:

```sh
node install.mjs --client generic --integration on --skills-dir "/path/to/skills" --rea-skill "/path/to/reverse-engineer-anything/SKILL.md"
```

`--skills-dir` accepts the parent skills directory; the installer creates `rea-reconstruction-companion` beneath it. It takes precedence over client defaults and environment variables. The REA path must identify the skill actually loaded by that client. An override disables broad automatic lookup. Paths with spaces should be quoted. If the installer runs outside the agent's environment, supply that agent's actual directory explicitly.

Keep the downloaded package or checkout separate from the installation destination. The installer rejects overlapping source/destination directories and a REA file inside the companion destination, including existing paths that differ only by casing on a filesystem that treats them as the same location.

The optional `agents/openai.yaml` adapter is installed only for Codex. The portable core and Claude Code installation do not depend on it. Refresh the host's skills or start a fresh session if the new skill is not visible.

</details>

## Optional REA integration

Choose one during installation:

| Choice | What the installer does | When it helps |
| --- | --- | --- |
| `--integration on` | Adds a marked instruction block to your selected REA `SKILL.md`. | When you want relevant REA reconstruction requests to load the companion without naming it separately. |
| `--integration off` | Installs only the companion and leaves REA untouched. | When you prefer explicitly invoking the companion or managing your own routing rules. |

The integration asks the agent to use the companion for understanding a target **for reconstruction**, planning a similar implementation, or rebuilding selected functionality. Its benefits are shared evidence, a consistent requirements-to-test trail, and focused returns to REA when design or testing exposes an unanswered question. Ordinary explanations, comparisons, and diagnostics stay narrow.

This is an instruction-based integration. It does not override client policies, grant tool permissions, connect MCP servers, guarantee model compliance, or force parallel execution. Without the rule, invoking the companion still tells the agent to use REA. The rule supplies the reverse direction: relevant REA work also loads the companion.

**REA skill refreshes can remove this rule.** In REA 6.5.0 (skill version 42), `rea doctor` requires byte-for-byte canonical skill files, so adding our block can produce `skill:identity` / `config_drift` with “Installed REA skill identity is stale” even when version and tool count match. This is a known cause, not a reason to ignore all stale or doctor diagnostics: other managed files or settings may also differ. The pinned [identity check](https://github.com/morluto/rea/blob/3b79af28e80785afce9f5998d8f03289402a1847/src/application/Doctor.ts) and [skill installer](https://github.com/morluto/rea/blob/3b79af28e80785afce9f5998d8f03289402a1847/src/application/SetupSkill.ts) show why `rea setup` restores canonical files and preserves edited originals in backups, removing the active companion block. An REA update that refreshes the skill can do the same; other upstream versions may differ.

After `rea setup`, `rea update`, or another REA skill refresh, recheck the selected integration and, if needed, restore only its block using the matching verified companion package; see [verification and scoped recovery](INSTALL.md#verify-and-report). Do not restore an entire old REA backup over newer instructions. If routing disappeared, explicitly invoke the companion or run the manual check. The optional on-use warning cannot run if the companion/helper is never invoked.

`off` means **do not manage REA**, not “remove a rule already installed.” To disable an earlier integration, remove only the block between `<!-- rea-reconstruction-companion:begin -->` and `<!-- rea-reconstruction-companion:end -->` in the selected REA `SKILL.md`, including the markers. Keep the rest of REA intact.

## Requirements and compatibility

The core skill is plain Markdown in the [Agent Skills format](https://agentskills.io/specification). It has no model SDK, paid API requirement, Python dependency, telemetry, or background service.

### No additional charges

The skill forbids initiating actions that could add charges: purchases, subscriptions/trials, metered APIs or model calls, billable cloud/CI/storage/deployment, and indirect paid work. Existing local tools and supplied evidence come first. If an action's no-charge status cannot be established for the actual environment, the agent must skip it and explain a local alternative or limitation. An available tool or a free tier is not sufficient evidence. It does not automatically launch agents, evaluations, or scheduled jobs.

This rule is an instruction, not a billing enforcement mechanism. An AI host may itself bill tokens or usage credits, and local execution consumes resources such as electricity. The skill cannot guarantee zero total cost or control another product's billing or model compliance. It must not enable extra paid usage or alter billing settings; use host/account spending controls for an absolute spending limit. No paid exception is part of this skill's workflow.

| Component | Requirement |
| --- | --- |
| Skill workflow | A capable agent that can read the skill and its references; REA tools or supplied REA evidence for actual investigation. |
| Included installer | Node.js 20 or newer. Uses only Node's standard library; no `npm install`, PyYAML, or network access. |
| Optional update helper (v1.2.0+) | Existing Node.js 20+. Uses the standard library and opt-in public GitHub requests; no packages, tokens, model calls or scheduler. |
| REA | Installed and configured separately for your client. REA and target-specific engines have their own requirements. |
| Release building | Python 3.10+ standard library, for maintainers only. Not needed to install or use the skill. |

Codex and Claude Code both support filesystem skills. Their discovery locations and invocation syntax differ; the installer handles those differences. Other agents can use the same core files through an explicit skills directory. Compatibility depends on the host's file/tool access, not just the model name. See the official [Codex skill documentation](https://learn.chatgpt.com/docs/build-skills) and [Claude Code skill documentation](https://code.claude.com/docs/en/skills).

Hosted uploads and chat-only clients are different: an uploaded skill ZIP cannot generally edit a separate local REA installation. Supply both skills and evidence through that host's supported mechanisms, or use a local agent for installation and live analysis. No live-model compatibility certification is implied by the installer tests.

## Optional weekly update checks (since v1.2.0)

Starting with **v1.2.0**, the updater is bundled inside the skill, including installations for Codex, Claude Code and generic clients. Enable it once after installation if you want release notifications. The host calls a small local helper when the skill is used; it contacts GitHub only when seven days have elapsed. An idle skill runs nothing. Earlier versions do not gain this automatically: manually install a published v1.2.0-or-later package first.

With checks enabled and recorded integration on, the current helper also inspects the recorded REA rule locally before cooldown or network decisions. Missing, changed/malformed, or unreadable/unsafe rules return `integration-needs-attention` without repair, state changes or networking. Disabled checks and integration off do not inspect REA. This warning is available only in versions containing this change and only when the companion/helper is invoked; it is not a background monitor or a full `rea doctor` check.

When a newer stable release is found, the agent offers **Update now / Remind me next week / Skip this version / Disable checks**. No answer means no update. Approval is tied to the offered release and asset; changed assets require a new offer. Local customizations stop automatic replacement. Successful updates retain backups, verify the result and preserve your selected client and REA integration setting.

Checks are **off by default**, independent of integration, and require existing Node.js 20+. There is no npm dependency, model/API key, paid service, extra model call, background daemon or scheduled AI task. Online operations also require confirmation that the actual network/tool environment cannot add charges. Unknown-cost or unavailable access is skipped; this is not an unconditional zero-resource-cost or billing-enforcement guarantee.

Read the [setup, commands, state location and recovery guide](skills/rea-reconstruction-companion/references/updates.md). Host instruction-following and local command access are required; the helper cannot force every AI host to invoke it or authenticate a human response. Installation refresh behavior depends on the host. The project owner's release approval process remains unchanged.

## Updates, backups, and recovery

- Repeating the same installation is safe and does not duplicate the integration block.
- Differing companion files require `--replace`; the installer backs up the entire prior companion directory before replacing it.
- REA edits preserve everything outside the marked integration block. The exact earlier pre-release rule can also be migrated; customized unmarked rules require review.
- Backups and a receipt are stored in `.rea-reconstruction-companion-installer/` next to the parent skills directory. The installer prints the exact transaction path.
- Failed commits attempt REA and companion recovery independently, so an unreadable or missing REA file does not prevent restoring the prior companion. Backups remain available; a detected concurrent edit is retained and reported rather than overwritten.
- Updating REA may replace its skill instructions. Follow [verification and scoped recovery](INSTALL.md#verify-and-report) after a refresh. Nothing monitors or rewrites REA in the background.

For manual recovery, use the printed receipt to locate the selected paths. Restore `companion-before` to the companion's former location if appropriate. Restore `rea-before.md` only when REA has no later changes you need to retain; otherwise remove or repair just the integration block. If a process was killed and left an `install.lock`, make sure no installer is running before removing that exact lock file and retrying.

## Source and development

For stopped local validation, see the bounded [interrupted-run recovery example](evals/resume/INTERRUPTED.md): preserve the failed attempt, validate eligible completed evidence, and rerun unfinished checks in a fresh destination.

The full source is included: skill and research references, installer, optional adapter, tests, manifest generator, and release builder. There are no hidden components or npm dependencies.

```sh
node scripts/manifest.mjs
node scripts/run-checks.mjs
python scripts/build_release.py
```

Tests cover installation choices, backups, rollback, package integrity, and the local behavioral evaluation harness, including deliberately incorrect candidates. CI runs on Windows, macOS, and Linux with Node 20, 22, and 24. The included workflows use standard runners, skip private repositories, and add no model API calls or artifact/cache uploads. These checks do not establish reconstruction quality on every target or model.

The test runner first checks directory-link fixture setup in the same temporary
parent/runtime. A denied or unknown probe leaves required validation incomplete;
it does not explain unrelated assertion failures or prove administrator rights
are needed. Original test failures and counts remain visible. See
[test environment diagnostics](CONTRIBUTING.md#test-environment-diagnostics) for
probe-only output, explicit full runs and supported local/CI next steps.

The [behavioral evaluation kit](evals/README.md) supplies portable tasks, raw evidence, independent executable oracles, and a human review rubric. It covers narrow functions, file formats, stateful workflows, original quirks versus approved improvements, ambiguous retries, inaccessible backends, contradictory evidence, hostile embedded instructions, cryptographic boundaries, and cost-sensitive tool choices. Paired selection tasks check that an implementation follows the requested compatibility or improvement goal; human review still verifies its reasoning and authorization. Running its harness tests is separate from evaluating an actual agent; model runs are not started automatically and require an environment established to incur no additional charge. See [CONTRIBUTING.md](CONTRIBUTING.md).

<details>
<summary><strong>Explore evaluation tools and worked examples</strong></summary>

**Reference app trial (v1.3.0):** [Pocket Tasks and its repeatable procedure](evals/reference/README.md) add a small local app with real saving, restart behavior, and a selection quirk to investigate. Export a separate evidence packet, document observations and requirements, then compare a reviewed reconstruction through a language-independent JSON process interface. The supplied tools use the existing Node runtime without packages, network calls, or model invocations. Self-tests validate the app/checker; actual host and REA trials remain separately recorded, with human review still required.

**Evidence verification (v1.3.1):** the packet tool adds a read-only `--verify` command to detect missing or changed reference evidence before and after a trial. It checks against the original trusted package, so rewriting the packet's hashes cannot hide a change. See the [reference procedure](evals/reference/README.md#1-freeze-the-trial-and-prepare-evidence) for its scope and limits.

**Worked investigation:** [follow Pocket Tasks from evidence to requirements](evals/reference/WALKTHROUGH.md). The example includes actual REA analysis, seven recorded runtime scenarios, a replay test, and a decision about preserving or improving an awkward behavior. Source/test exposure and incomplete analysis are disclosed. It stops before candidate implementation and is not a model benchmark or a compatibility certification.

**Worked reconstruction (v1.3.3):** [continue from those requirements to an implementation and validation](evals/reference/reconstruction/README.md). A standalone local candidate passes the 16-session checker and replays the ten captured observation sessions. The example links requirements to code and tests, records an environment-limited first attempt, and supplies a repeatable validator with evidence-integrity checks. It uses existing Node.js without packages or network/model calls. Prior source and reviewer exposure remain explicit; this teaching example is not an independent evaluation or certification.

**Worked browser improvement (v1.3.14):** [preserve parity while improving save feedback and conflict recovery](evals/browser-improvement/README.md). Separate reference, parity and improved fixtures demonstrate failed-save feedback, retained drafts, explicit recovery and overlapping tab writes. The portable example includes acceptance requirements, replay routines and captured results, with cooperative-lock, controlled-injection and same-agent limits.

**Measured optimization (v1.3.24):** [test a plausible improvement against complete import workloads](evals/measured-optimization/README.md). A frozen protocol, literal behavior oracles, raw paired samples and executable evidence checks show a candidate that passes the selected correctness cases but fails to demonstrate an overall speed benefit. The original reconstruction remains unchanged; no dependency, model benchmark or CI timing threshold is added.

**Checkpoint/resume evaluation (v1.3.4):** [resume unchanged work or reassess a changed target](evals/resume/README.md). Two supplied-evidence cases exercise scoped reuse, partial implementation, preserved history and stale result handling. A local JSON-only checker performs 15 data comparisons per case; actual reasoning, actions and preservation still need human review. The skill includes a portable checkpoint guide, with no memory service, SDK, new dependency or automatic worker. The worked records are disclosed maintainer-authored examples, not cross-host/model certification.

**Measured environment example:** [revalidate behavior after a relevant setting changes](evals/resume/environment/README.md). Identical fixture bytes run under two controlled cap settings with a minimal local Node probe. Reports retain unaffected formatter evidence and recheck score/integration behavior. Cross-version drift and cross-host compatibility remain unverified.

</details>

## Support the project

If this project is useful to you, you can [support my work on Ko-fi](https://ko-fi.com/shadowswaps). Contributions are optional; the project remains freely available under its open-source licenses.

<p align="center">
  <a href="https://ko-fi.com/shadowswaps">
    <img src="assets/kofi-support.png" alt="Support ShadowSwaps on Ko-fi" width="480">
  </a>
</p>

Bug reports, reproducible examples and focused pull requests are also welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

## License

All original code, skill instructions, tests, build scripts, and documentation in this repository are released under the [MIT license](LICENSE). You may use, modify, and redistribute them, including commercially, subject to that license. The evaluation kit includes a small, attributed [Wycheproof test-data subset](evals/fixtures/wycheproof-empty.json) under its bundled [Apache-2.0 license](evals/fixtures/wycheproof-LICENSE.txt); it remains fully open-source. Upstream REA and linked research remain separate projects; no REA code or cryptographic implementation is bundled. No particular AI provider or proprietary model is required by this project.
