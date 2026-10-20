# Worked reconstruction security boundary

This proposed local boundary wraps the existing Pocket Ledger composition.
Read the [frozen contract](CONTRACT.md), [literal expectations](expectations.json)
and [identity](identity.json). Historical codecs, examples and oracles remain
unchanged. Source-exposed same-agent authorship/evaluation is disclosed; this is
an instructional implementation of selected requirements, not original parity.

From the repository or extracted release root with existing Node.js 20+:

```sh
node evals/reconstruction-security/run.mjs ./security-trial
node --test tests/reconstruction-security.test.mjs
```

Choose a new, nonexistent directory under an owned scratch parent. The batch
runner exits 0 with `selected-boundary-passed` only after its assertions run;
exit 2 means failed invocation/assertion. It refuses existing directories. Keep
the failed run and choose a new name after correcting a problem. No packages,
accounts, network requests, service, port or shutdown command are involved.

Walkthrough: a writer imports Unicode and markup-looking synthetic titles into
`active.json`; a reader exports them literally. Missing identity, another ledger,
unknown grants, a reader writing and a caller-supplied principal are denied by
direct dispatch, bypassing any UI. Oversized/deep/malformed bytes, sensitive
unknown fields and a late invalid row preserve exact prior file bytes and state.
A sink double accepts only textContent. Diagnostics use fixed codes and selected
known token/contact markers do not occur in storage/export/error/report surfaces.
Reopen, old-schema compatibility and quoted container characters are exercised.
`result.json` is a concise synthetic result. The runner never resets real data.

The test file also injects eight faulty variants into this same trial: bypassed
authorization, principal spoofing, ignored size/depth rejection, diagnostic and
export leakage, destructive late rejection and HTML sink use. Each must fail its
corresponding assertion; an unrelated exception is not a successful challenge.

Authentication is **simulated** through a fixed resolver in the runner. The
boundary is an in-process demonstration, not protection from someone controlling
the process/files. Titles are exported intentionally and could contain personal
data; no general redactor is implemented. Known synthetic-marker checks cannot
prove arbitrary data safe to share. No real credentials, browser XSS trial,
auth/session lifecycle, remote service, hostile filesystem, concurrency, crash,
penetration test, independent user acceptance or live model evaluation is run.
Keep those limits with results. See the [conditional guidance](../../skills/rea-reconstruction-companion/references/reconstruction-security.md).
