# Contributing

Contributions to the instructions, research methods, installer, tests, and documentation are welcome. Use issues for reproducible problems and focused pull requests for changes. Never include private targets, credentials, proprietary application files, or personal analysis reports in a public report.

Keep the core skill independent of provider-specific APIs and invocation syntax. Put client-specific settings in an adapter. Preserve the distinction between observed evidence, inference, and proposed reconstruction choices, and keep narrow tasks narrow.

## Local checks

Use Node.js 20 or newer. There are no npm dependencies.

```sh
node scripts/manifest.mjs
node scripts/test.mjs
```

Run the manifest command after editing any packaged file, including tests. The installer verifies package hashes before changing an installation. Hashes detect accidental corruption; they are not a cryptographic signature or a substitute for trusting the source.

Tests use isolated temporary directories. Add coverage for meaningful behavior changes, especially installation paths, optional integration, backups, and recovery. Do not run tests against a real user's skill directory. Behavioral testing with a real AI host or REA target is separate; record the model/host, target identity, expected result, observed result, and limitations when reporting it.

### Test environment diagnostics

`npm test` (or `node scripts/test.mjs`) first probes one directory link in the
resolved OS temporary parent used by the fixtures: a junction on Windows, a
directory symlink elsewhere. It uses the current Node runtime and an exclusively
owned small child directory, unlinks its link before removing empty directories,
and never recursively follows a junction. This observation does not guarantee
every later fixture or race will work. No installed-skill command starts probes.
`node scripts/test.mjs --help` performs no filesystem probes.

If preflight is incomplete, the default stops before the full suite. It reports
tests as **unrun**, counts as unknown (`null`), and the required gate as
**incomplete**, with exit 2. `--preflight-only` always leaves validation incomplete
(exit 2), even on a supported host. After a relevant changed condition, use the
same command again. If a full run is useful despite the probe result, explicitly
use `node scripts/test.mjs --run-tests`; it runs the unchanged Node suite. Direct
`node --test` also remains available. Neither command skips link safety cases to
accommodate a denied capability. Avoid repeating a known blocked full run without
a relevant changed condition.

The runner streams original TAP output, errors and final counts on stdout.
Schema 1 JSON lines on stderr separately report `preflight` observations and
`validation` execution, child exit/signal/error, final counts and gate. Actual
link-creation failures add a `fixture-setup` record, then rethrow the original
error. Records include link kind, stage, result and OS code/errno/syscall when
available; diagnostic records omit absolute paths and error messages. Original
Node failure output can contain fixture paths; redact those before sharing.
`denied` means observed `EPERM` or `EACCES`, not a diagnosis of sandbox policy or
administrator requirements. Other probe errors have unknown cause. A denied
probe does not explain unrelated assertion failures. Cleanup errors remain
separate observations and cannot erase a prior probe or test error.

Exit 0 requires complete diagnostics, child exit 0, known final counts and no
failed, cancelled or todo tests. Existing platform-specific skips remain visible
in the original counts; no new skip policy is added. A nonzero suite exit is
preserved, along with its original failures. Otherwise missing diagnostics,
unknown results, unavailable execution, signals or cleanup errors leave exit 2
and the gate incomplete. A probe is never a product pass. CI and the extracted
release verifier use this same runner after their existing integrity checks.

For blocked required safety cases, use the unchanged suite in an already
supported local environment or the existing authorized public-repository PR CI
matrix. Required validation remains incomplete/failing until those cases execute
successfully. The tooling does not elevate, change permissions, install software,
dispatch remote CI, increase timeouts or retry automatically. Keep local blocks
and CI commit/tree/package identities with validation evidence; a supported CI
pass does not retroactively change a local denial.

The v1.2.0 updater tests use synthetic releases, local ZIP fixtures, a controlled clock and injected HTTP responses; they never enable checks in real installations or contact GitHub. Exercise the seven-day limit, failed checks, consent/offer changes, no-charge gate, local modifications, client/integration preservation, archive validation, locks and recovery. The update helper executes the existing installer from `skills/rea-reconstruction-companion/scripts/installer.mjs`; `install.mjs` re-exports it for existing callers. Do not execute downloaded installer code or introduce automatic release publication. Live host prompting is a separate, explicitly reported test.

Use the [behavioral evaluation kit](evals/README.md) to assess instruction changes. Its executable oracles and harness regression tests are local and dependency-free. They do not call models or certify instruction following. Keep prompts/evidence separate from reviewer expectations, inspect actual artifacts and action traces, and record unrun cases as unrun. Do not run additional agents or metered evaluations to improve a score. Run live evaluations only where no additional charge can occur; otherwise report that validation limit.

The [Pocket Tasks procedure](evals/reference/README.md) adds a shipped local reference app and process-level reconstruction checks. Keep candidate evidence separate from the reviewer corpus, preserve artifact hashes and failed trial records, and review generated code before execution. Run `node evals/reference/check.mjs --reference` for the reference self-check; this is not a completed REA or model trial. Change hand-authored expectations only for an explicitly revised target/contract, never to accommodate a candidate defect.

The [worked reconstruction](evals/reference/reconstruction/README.md) is a disclosed maintainer-informed example. Run its fixed local validator after changing the candidate or evidence; preserve failures and update its captured report only from actual output after review. Its hash regression test prevents quietly retaining a report for changed source bytes. Keep this answer material outside new candidate packets and avoid presenting its successful comparisons as a blind evaluation or release approval.

The [resume evaluation](evals/resume/README.md) checks two fixed JSON checkpoint records. Keep its authored examples and expected comparisons outside fresh agent evidence. Review actual actions and preserved bytes separately; a status label cannot prove preservation or authorization. Fixture or checker changes require reassessing the expected decisions and recapturing worked results from a real local check, without silently rewriting historical evidence to claim current parity.

The no-additional-charges rule applies to development and indirect work too. The included CI jobs skip private repositories and use standard public-repository runners; do not add paid runners, model APIs, cloud jobs, cache/artifact storage, or billing changes. Verify the actual environment before triggering remote checks; a copied workflow or free-tier label alone is not a guarantee. GitHub documents the distinction in [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions). Do not represent Markdown instructions or passing tests as a billing sandbox.

## Security scanning

The CodeQL workflow checks JavaScript/TypeScript, Python, and GitHub Actions workflows on pull requests (including forks), pushes to `main`, a weekly schedule, and manual runs. It uses GitHub-hosted runners and does not add a dependency for people installing the skill. Review findings alongside the installer tests; CodeQL does not validate the quality of the Markdown instructions or guarantee that all vulnerabilities are found.

Fork submissions use the `pull_request` event with GitHub's restricted token and no repository secrets. A first-time contributor's workflow may wait for the owner's approval to run under the repository's Actions policy; that approval only starts checks and does not approve a merge or release. Keep CodeQL on this event, use pinned action commits, and retain `persist-credentials: false`. Do not use `pull_request_target`, supply a personal token, or grant `contents: write` to scan a fork. Review and update the pinned CodeQL action during maintenance.

The workflow can upload security results but cannot publish releases. Passing a scan does not replace the owner's review and release approval described below.

## Review and release approval

Anyone may fork the repository and propose changes through a pull request. To propose a release, open a **Release request** issue and link the relevant pull requests, exact commit, validation results, release notes and any built artifact checksums.

The repository owner, **@ShadowSwaps**, reviews changes and decides whether to merge and publish. A pull request, successful CI run, bot review or automated maintenance run is not authorization to publish. Release approval must identify the version, commit and artifacts being approved; changes after approval require another review. Automation must prepare proposals and wait for that decision. It must not approve its own work, merge, push to the default branch, create release tags or publish releases without the owner's explicit approval of that action.

Contributors do not need collaborator/write access to submit proposals. Keep that access restricted: on a personal GitHub repository, collaborators can create and edit releases. Branch and tag rules do not provide a separate approval gate for every release edit. Tools authenticated as the owner inherit that account's privileges and must also follow the owner's approval instructions.

The `CODEOWNERS` file assigns all paths to the owner. Repository protections require pull requests and reserve default-branch updates to the owner through the pull request interface. Because an account cannot approve its own pull request, an owner-authored proposal is reviewed by the human owner and merged using the owner-only exception when appropriate. This exception is not permission for an agent to merge without that review.

## Release preparation

1. Update the version in `package.json` when preparing a release.
2. Run `node scripts/manifest.mjs` and `node scripts/test.mjs`.
3. Run `python scripts/build_release.py` with Python 3.10+; it uses only the standard library and verifies the generated archive.
4. Confirm CI passes for the exact proposed commit, then submit the version, commit, release notes, generated ZIP and `.sha256` checksums for owner review. Keep unapproved build artifacts local.
5. After explicit owner approval of that exact release, the owner or a specifically authorized agent may create the corresponding tag and publish the approved ZIP, `.sha256` file and release notes. Verify the published tag and asset checksums. Do not overwrite older release assets.

Original project source, including all build and validation tools, is MIT licensed. Original contributions should use the same license. Any imported third-party data must retain its upstream license, attribution, source revision and modification notices, as with the evaluation kit's small Apache-2.0 Wycheproof subset. REA itself remains an upstream dependency; do not vendor its full skill or engines just to change the integration rule.
