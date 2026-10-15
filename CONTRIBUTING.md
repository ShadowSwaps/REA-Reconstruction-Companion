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

## Release build

1. Update the version in `package.json` when preparing a release.
2. Run `node scripts/manifest.mjs` and `node --test`.
3. Run `python scripts/build_release.py` with Python 3.10+; it uses only the standard library and verifies the generated archive.
4. Publish the generated ZIP and `.sha256` file from `dist/` with the corresponding Git tag and release notes.

The source repository, including all build and validation tools, is MIT licensed. Changes submitted for inclusion should use the same license. REA itself remains an upstream dependency; do not vendor its full skill or engines just to change the integration rule.
