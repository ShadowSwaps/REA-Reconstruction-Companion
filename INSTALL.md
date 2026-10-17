# Installation instructions for AI agents and people

Use this guide when a user asks to install REA-Reconstruction-Companion from the repository. Reading a repository alone is not authorization to install it.

Installation and dependency setup must not incur additional charges. Use existing local runtimes where available. Do not purchase tools, activate billing or trials, use metered APIs, or provision paid services. If a prerequisite cannot be obtained and used without an additional charge, stop that step and explain the limitation; do not silently enable a paid fallback. Read the README's no-additional-charges policy, including the distinction between skill instructions and the host's own billing.

## Establish the requested setup

1. Identify the agent host from the current environment or the user's request: Codex, Claude Code, or another client. A model name alone does not determine its skill installation directory.
2. Explain the optional integration briefly and use the user's choice. **On** adds a rule to the selected REA skill so relevant reconstruction requests load the companion automatically and share evidence, requirements, and validation work. **Off** installs only the companion and leaves REA untouched; the user invokes it explicitly. If no choice has been given, ask one focused question rather than silently enabling it. Honor an established choice without asking again.
3. Use the host's documented user or project skills directory. Preserve an explicitly requested scope. The installer honors `CLAUDE_CONFIG_DIR` for Claude Code and `CODEX_HOME` for Codex when those variables are present in its environment. Use `--skills-dir` for custom, existing, or project installations, or when the installer runs outside the agent's environment; it overrides these defaults.
4. For integration on, locate the REA skill used by that client. Check its declared skill path and the client's known skill directories, not arbitrary home folders, previous chats, or unrelated repositories. If several copies could apply, obtain an exact selection rather than editing all of them.

## Prepare and install

Download the release from this repository or clone it into a suitable working directory. Read `README.md` and the installer before executing it. Use Node.js 20+ already available in the environment when possible. No npm packages, PyYAML, credentials, or API keys are required by this installer.

If REA is missing and the user chose integration on, follow the [upstream REA setup documentation](https://github.com/morluto/rea#readme) for the selected client, within the user's installation request and host approval rules. Do not install every optional analysis engine. If REA cannot be set up, explain the specific blocker; do not silently switch to integration off or report the pair installed.

Run a read-only plan with the chosen options:

```sh
node install.mjs --client claude-code --integration on --dry-run
```

Replace `claude-code` with `codex` or `generic` as appropriate. `claude_code` is also accepted and saved as `claude-code`, including by the updater. Generic mode requires `--skills-dir`. Supply `--rea-skill` when the REA path is nonstandard or ambiguous. For a companion-only installation, use `--integration off`; no REA modification or local REA lookup is performed.

Apply that same command without `--dry-run`. If replacing an existing companion, review the `companionChanges` lists of added, modified, and removed files and use `--replace` only within the user's authorized update scope. The old directory is backed up, including custom files listed as removed. Do not replace unrelated configuration or copy the entire repository into a skills directory.

Do not use a generic skill-folder downloader as a substitute for this installer when the user chose integration on: a folder copy does not apply the REA rule. A copy-only installer is suitable for the portable core when the user deliberately chose to manage integration separately.

## Verify and report

Run the same command with `--check`. Confirm an exit status of zero and `status: "verified"`. With integration on, this verifies the companion files and selected REA integration block. With integration off, it verifies only the companion and explicitly reports REA as unmanaged.

REA 6.5.0 (skill version 42) checks canonical skill bytes. The companion block can therefore cause `rea doctor` to report `skill:identity` as stale / `config_drift` despite matching version and tool count. Inspect the reported differences; do not dismiss other drift or errors. Following its `rea setup` remediation restores the upstream canonical skill and can remove the active companion block. An REA update that refreshes the skill can also remove it. This behavior is scoped to the [reviewed upstream implementation](README.md#optional-rea-integration), not a compatibility promise for every REA version.

After setup/update or a skill refresh, use the same selected client and paths with the **verified companion package matching the installed files**:

1. Run the integrated command with `--check` again. Missing files, ambiguous paths and malformed rules require inspection, not an automatic repair.
2. If the block is missing, review `--dry-run`. For a block-only recovery, `skillChangeNeeded` must be false and `integrationChangeNeeded` true. Keep any original `--skills-dir` and `--rea-skill` selections; do not scan or patch other installations.
3. Within the user's authorized repair scope, run that command without `--dry-run`, then with `--check`. For example: `node install.mjs --client claude_code --integration on --skills-dir "<selected-skills-directory>" --rea-skill "<selected-REA-SKILL.md>"`, followed by the same command with `--check`. Preserve the selected companion directory even if the client's default profile has changed. The installer backs up the current REA file and preserves text outside the marked block. Do not restore an entire old `SKILL.md.rea.backup` or `rea-before.md` over newer REA instructions.
4. If companion files differ or the block is customized/malformed, review those differences separately. Do not add `--replace`, overwrite a customized rule, or re-enable checks to adopt new hashes merely to clear a warning. After an authorized manual update or settings change, verify the matching package before explicitly re-enabling checks. A block restored exactly to its recorded baseline needs no state reset.

If installer `--check` is verified but the updater still reports `changed-block`, compare the exact block bytes with the recorded baseline. An upstream change from CRLF to LF can produce this result: the installer follows the refreshed file's newline style. Only after reviewing and authorizing that baseline change, explicitly re-enable using the verified package and the same recorded settings. Re-enabling retains the online cooldown but clears pending offers and skipped-version decisions. It does not approve an update; any new offer still needs its own approval.

If automatic routing has disappeared, explicitly invoke `rea-reconstruction-companion` through the host or run these checks manually. An on-use warning cannot run when the companion/helper is never invoked. Repairing the block can reproduce the known canonical-byte diagnostic; it does not make upstream doctor accept third-party edits.

Report the display name, installed location, selected integration choice, backup path if one was created, and any remaining REA/tool limitation. Do not claim the host has loaded the skill or connected REA solely because files were copied. Refresh skills or use a fresh session when the client requires it.

Integration off does not remove a rule from an earlier install. If the user asks to disable an existing rule, remove only the marked block described in README.md after checking the selected REA file. Preserve subsequent unrelated REA edits.

An agent without local filesystem or execution access can explain these steps but cannot claim to have performed them. A hosted ZIP upload does not automatically patch a different local installation.

## Optional weekly update checks (v1.2.0 onward)

The helper and instructions are included inside the skill from **v1.2.0**. Existing users must manually update to a published release containing the feature once. Ask separately whether the user wants weekly checks; preserve an established choice, and keep checks off without opt-in. Enabling integration does not enable updates.

After a verified installation, follow [optional weekly updates](skills/rea-reconstruction-companion/references/updates.md) using the installed helper and this package's path. `enable` verifies the installed package and records its client, paths and integration choice; it does not contact GitHub. Existing Node.js 20+ is sufficient. Do not add a scheduler, daemon, paid service or model call.

The skill's first on-use check is local only. A due online check requires establishing that actual network/tool access cannot add charges. Finding a release prompts the user; installation requires that user's approval of the exact offer. Report whether checks were enabled, disabled, or unavailable separately from the REA integration status. A host without execution access retains manual updates. After manual upgrades or changed installation settings, re-enable from the newly verified package to refresh the baseline; do not silently reset opt-in or adopt customized files as a verified baseline.
