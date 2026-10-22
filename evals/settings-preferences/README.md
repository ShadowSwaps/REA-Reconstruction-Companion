# Offline settings and preference example

Run `node --test tests/settings-preferences.test.mjs` from the repository root.
No dependency installation, network, real profiles, browser or model calls.

This is a proposed teaching policy, not a recovered application's behavior.
The same author separately reasoned and froze 10 sequences / 36 literal states
in `expectations.json` and its SHA-256 identity before adapting `candidate.mjs`.
The expected values were not captured from the candidate. Source is exposed;
this is neither independent authorship nor a model instruction-following test.
The checker compares draft/applied values, effective values and sources, dirty,
unsaved, feedback status and exact file text at intermediate steps. It separately
reads actual bytes so a candidate-reported snapshot cannot conceal a write.

## Finite selected policy

- One selected disposable JSON file per case; JSON object with `version`, object
  `prefs` and unrelated JSON data. Fields: `enabled` boolean (default true),
  `limit` integer 0–9 (default 3), `label` string (default `auto`). Missing means
  inherit; false, zero, empty and explicit default remain present values.
- Scope precedence: ephemeral session override → applied profile override →
  default. Effective values have separate source labels. Drafts do not affect
  runtime behavior before Apply/Save. Only known fields are editable through
  valid actions; unknown JSON preference and top-level values are retained.
- Apply accepts the draft into runtime memory without writing the file. Save
  writes the draft, then accepts it as applied/stored. Cancel restores the last
  applied values, including an earlier Apply, without writing. `dirty` means
  draft differs from applied; `unsaved` means draft differs from loaded/stored
  preferences. Thus Apply can be clean but unsaved. These meanings are local
  policy, not universal definitions for other apps.
- Reset removes the three known overrides in the pending draft; unknown fields
  survive. Cancel reverses that reset; Save commits removal. Unset removes a
  selected key rather than storing its default. This differs even when the
  effective value stays the same. Session overrides never enter the save payload
  and disappear on fresh-instance reopen.
- Version 0 maps `on`/`n`/`caption` into the three known version 1 keys in memory;
  absent old keys remain absent. Mixed old/new known keys are rejected as
  ambiguous. Reading/Cancel does not rewrite old bytes; explicit Save writes
  version 1 and preserves unrelated data. No downgrade writer is supplied.
- Invalid JSON/shape/known value uses default runtime values with an invalid
  status, preserving original bytes and blocking writes. Unsupported versions
  similarly use defaults with unsupported status and block writes. Fallback is
  not a claim that the original stored data is absent. Save on either blocked
  profile reports blocked and leaves bytes untouched. Editing/reset/apply are
  also blocked there; a valid session override can still mask the fallback.
- Known version 1 writes use compact JSON plus LF. Original formatting is not
  retained on Save; unrelated JSON values are. The fixture declares ordinary
  unique-key objects, finite JSON data, no special prototype keys, string keys
  and valid actions. Arbitrary inputs, duplicate keys, large/untrusted files,
  external edits and multiple writers are outside this example.

Independent cases reset their file and state. Within each sequence, actual Node
filesystem reads/writes are used. Reopen constructs a fresh candidate instance
from the same file and drops session/draft memory; it is not a snapshot restore.
This is fresh-instance local persistence, not an OS-process restart, browser
storage test, external service, crash/power-loss durability or concurrent access
guarantee. The writer is deliberately simple and provides no transactional
recovery after partial I/O failure. I/O errors propagate; OS errors are not
converted into product passes. No real user configuration is touched.

## Fault challenges and limits

Twelve disposable faults each pass the same six ordinary edit/save/reopen and
cancel checkpoints before a named actual mismatch: falsy fallback, Apply writing
disk, Cancel undoing Apply, Apply claiming saved, reset writing defaults, reset
dropping unknowns, reset applying immediately, session leaking to storage, Save
dropping unknowns, read migrating on disk, invalid Save rewriting bytes and unset
writing a default. Tests stop at the intended assertion; errors do not count as
useful kills. Additional checks cover selected-file isolation, detached snapshots,
malformed JSON preservation, comparator field sensitivity and independent byte
readback. No original parity, all-schema compatibility, real GUI behavior,
cross-host or backend persistence is established by these finite checks.

Use the selectively loaded [guidance](../../skills/rea-reconstruction-companion/references/settings-preferences.md)
to investigate the actual selected target. Standalone skill installations omit
these repository-only evaluation files. Historical fixtures remain unchanged.
