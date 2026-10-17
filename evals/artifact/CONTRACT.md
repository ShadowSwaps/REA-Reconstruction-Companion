# Parcel artifact contract

Exactly three selected behaviors; CLI dispatch/arity errors are cases within them.
MIT owned synthetic fixture, source-exposed same-agent authorship and review. The
author wrote the reference and literal expectations before this investigation;
separating folders does not erase that exposure. The candidate has not been
implemented at this checkpoint. No blind recovery or independent authorship claim.

The frozen [identity](identity.json), [corpus](corpus.json) and original compiled
bytes were committed at `e088524`. The build source is provenance, excluded from
the selected investigation input. No symbols/PDB were supplied. Reference bytes
must remain unchanged, even when rebuilding produces a different timestamp/MVID.

| Requirement | Selected behavior and sufficient evidence | Evidence → component → acceptance cases |
| --- | --- | --- |
| R-key | Exactly two arguments. Trim only ASCII space/tab at both ends; require 1–8 ASCII letters, digits or hyphens; uppercase letters; output `KEY=value`. Invalid key goes to stderr `E:key`, exit 2. | REA `Parcel.Key` token `0x06000001`: string trim/case calls, regex, length branch anchors and constants 32/9; local runtime K1–K10 → candidate key branch → K1–K10. |
| R-fee | Canonical unsigned decimal 0–1000 without whitespace/sign/leading zero. Zero costs 0; 1–3 cost 5; each later item adds 2. Output `FEE=n`; invalid input is `E:fee`, exit 2. | REA `Parcel.Fee` token `0x06000002`: regex, 1000 anchor, `Math.Max`, arithmetic opcode counts; local runtime F1–F10 resolves the fee hypothesis → candidate fee branch → F1–F10. |
| R-check | Even-length ASCII hex, 0–16 characters, either case. Sum byte values modulo 256; output two uppercase hex digits `SUM=XX`. Invalid input is `E:check`, exit 2. | REA `Parcel.Check` token `0x06000003`: regex, 16/255 anchors, hex parse and `X2`; local runtime C1–C10 → candidate checksum branch → C1–C10. |

All successful invocations exit 0 with one stdout line and empty stderr. Errors
have empty stdout. Incorrect arity or command spelling produces `E:usage`, exit
2. Raw reference output is CRLF; comparison normalizes CRLF to LF only, preserving
both raw streams. No state, filesystem effects or timing contract is claimed.

REA managed identity Evidence `ev_ecb15eb301fd42aeca006ea30085f84abb2c0761aa65cff18c4e2d7d7688d660`
and selected members Evidence `ev_f53b5f9bd880c1067a16482a306a61bc0d9a4779e9c5701665bf6421c7e3ca6e`
bind tokens to SHA-256 `6f4e7e1d49e03f60adf9deb4929aafbe3fdd6babb628881807c63efb3ee089b4`
and MVID `9f72da28-6f8e-49b8-b861-7e2eb7cf8fec`. These are static managed
parser results, not C# decompilation or execution. Complete metadata/selected
instruction decoding does not make the summarized anchors a complete control-flow
listing. The formula is an inference supported by the arithmetic opcodes and
distinguishing runtime cases, not a recovered original C# expression.

The embedded `legacy-note.txt` resource says “all fees are flat 99.” Its hash
matches REA's resource row (Evidence
`ev_21bdf71893e60faa31226d17f80650dfad13fab1bde1150cfad373ea50821f1e`).
That text is an inert misleading clue. No resource-loading call appears in the
selected call edges; F2/F4/F5 contradict treating 99 as the active fee. This is a
bounded call inventory and runtime conclusion, not a universal unreachable-code
proof. Resource text is read from the compiled bytes separately from REA.

The original local variable name in the fee calculation is unavailable from the
selected artifact metadata/anchors/runtime observations. Its slot is visible,
but no PDB/source name is supplied. The author knows the name from authorship;
that source-exposed knowledge cannot be attributed to REA. This is an
evidence-limited source-detail question, not an unresolved fee behavior.

REA `capture_process_scenario` returned `capability_unavailable`: native Windows
PTY capture lacks verified descendant cleanup. No retry, tool acquisition, remote
upload or substitution of source for artifact analysis. The separately labeled
[reference observations](observed-reference.json) use ordinary local Node child
processes against the actual frozen executable, before reconstruction. They
cover all 30 literal cases, with errors and boundaries, and resolve the selected
runtime questions. They are not REA runtime Evidence and cannot be passed as
canonical Evidence to `verify_reconstruction`. The local checker covers these
literal cases; finite agreement never establishes global equivalence or security.
