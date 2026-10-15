# Contributing

Contributions to the instructions, research methods, installer, tests, and documentation are welcome. Use issues for reproducible problems and focused pull requests for changes. Never include private targets, credentials, proprietary application files, or personal analysis reports in a public report.

Keep the core skill independent of provider-specific APIs and invocation syntax. Put client-specific settings in an adapter. Preserve the distinction between observed evidence, inference, and proposed reconstruction choices, and keep narrow tasks narrow.

## Local checks

Use Node.js 20 or newer. There are no npm dependencies.

```sh
node scripts/manifest.mjs
node --test
```

Run the manifest command after editing any packaged file, including tests. The installer verifies package hashes before changing an installation. Hashes detect accidental corruption; they are not a cryptographic signature or a substitute for trusting the source.

Tests use isolated temporary directories. Add coverage for meaningful behavior changes, especially installation paths, optional integration, backups, and recovery. Do not run tests against a real user's skill directory. Behavioral testing with a real AI host or REA target is separate; record the model/host, target identity, expected result, observed result, and limitations when reporting it.

## Review and release approval

Anyone may fork the repository and propose changes through a pull request. To propose a release, open a **Release request** issue and link the relevant pull requests, exact commit, validation results, release notes and any built artifact checksums.

The repository owner, **@ShadowSwaps**, reviews changes and decides whether to merge and publish. A pull request, successful CI run, bot review or automated maintenance run is not authorization to publish. Release approval must identify the version, commit and artifacts being approved; changes after approval require another review. Automation must prepare proposals and wait for that decision. It must not approve its own work, merge, push to the default branch, create release tags or publish releases without the owner's explicit approval of that action.

Contributors do not need collaborator/write access to submit proposals. Keep that access restricted: on a personal GitHub repository, collaborators can create and edit releases. Branch and tag rules do not provide a separate approval gate for every release edit. Tools authenticated as the owner inherit that account's privileges and must also follow the owner's approval instructions.

The `CODEOWNERS` file assigns all paths to the owner. Repository protections require pull requests and reserve default-branch updates to the owner through the pull request interface. Because an account cannot approve its own pull request, an owner-authored proposal is reviewed by the human owner and merged using the owner-only exception when appropriate. This exception is not permission for an agent to merge without that review.

## Release preparation

1. Update the version in `package.json` when preparing a release.
2. Run `node scripts/manifest.mjs` and `node --test`.
3. Run `python scripts/build_release.py` with Python 3.10+; it uses only the standard library and verifies the generated archive.
4. Confirm CI passes for the exact proposed commit, then submit the version, commit, release notes, generated ZIP and `.sha256` checksums for owner review. Keep unapproved build artifacts local.
5. After explicit owner approval of that exact release, the owner or a specifically authorized agent may create the corresponding tag and publish the approved ZIP, `.sha256` file and release notes. Verify the published tag and asset checksums. Do not overwrite older release assets.

The source repository, including all build and validation tools, is MIT licensed. Changes submitted for inclusion should use the same license. REA itself remains an upstream dependency; do not vendor its full skill or engines just to change the integration rule.
