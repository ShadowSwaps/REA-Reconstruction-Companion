# Proposed notes boundary (synthetic)

This contract and the reviewer literals were specified before the candidate.
They are proposed local behavior, not recovered server facts. No real app,
account, recording, authentication, remote request or provider is involved.
Same-agent/source-exposed work is not an independent agent benchmark.

`evaluate({mode, actions, recordings?, initialBytes?})` runs an isolated local
session and returns its final observation. Each invocation owns a temporary disk
store that is removed on return. `reopen` reads it again; this demonstrates local
file persistence within the run, not retention after the example ends, crash
durability or concurrent-writer safety. No user paths or credentials are accepted.

Modes: `local` uses a proposed replacement adapter, `replay` consumes supplied
finite synthetic records, `deferred` has no external implementation. Actions:

| Action | Effect |
| --- | --- |
| `{type:"edit",text}` | Replace draft with exact string (0..256 UTF-16 code units). |
| `{type:"save",reject?:true}` | Write JSON `{text:draft}` locally; set synchronization pending. `reject:true` is a controlled pre-write fault retaining draft and prior bytes. No upload. |
| `{type:"reopen"}` | Read local bytes; restore saved text/draft, reset list view. Invalid bytes yield `malformed-store`, retain draft and bytes, and do not seed/overwrite a store. |
| `{type:"list",collection}` | Call selected adapter once with `{operation:"list",collection}`. Collection is any string within the same bound; only `notes` is supported locally. No retries or remote fallback. |

An absent store has saved=null, draft="", synchronization=`not-requested`.
An existing valid store has saved/draft equal to its text, synchronization=`pending`
(remote state unknown). `initialBytes` supplies exact UTF-8 text up to 2048 bytes;
omission means no file, not an empty JSON document. Valid store has exactly one
field `text` containing a bounded string. Failed initial load prevents subsequent
actions, preserving malformed bytes. Other invalid input returns null before work.
Up to 16 actions and 16 replay records; unknown action fields/types are invalid.

Adapter request/response boundary: input above; output `{kind:"ok",items:[strings]}`,
`{kind:"timeout"}` or `{kind:"unavailable"}`. At most 16 bounded strings; no extra
response fields. Success with [] is empty data. Failure retains prior displayed
items (initially null), status=`error`, explicit error code. No auth or identities
are modeled; ordering is literal; timeouts are supplied outcomes, not timed network
experiments. The caller owns local draft/storage; adapter owns list results only.

Local list returns [] for absent store or [saved] for a saved note; unsupported
collection returns unavailable. Deferred list always returns unavailable. Replay
records are `{request,response}`; each list consumes exactly one record and matches
the complete request structurally, ignoring JSON key order. Wrong request or no
remaining record yields `replay-mismatch`; invalid response yields
`malformed-response`. Records never establish remote persistence or auth behavior.

Final observation: `mode`, `draft`, `saved`, `items` (null or last successful list),
`status` (`idle`, `edited`, `locally-saved`, `reopened`, `ready`, `error`), `error`
(null or named code), `synchronization` (`not-requested` or `pending`),
`remoteVerified:false`, `adapterCalls`, and `storeBytes` (exact string or null).
Successful edit/save/reopen/list clears prior error; failed save does not change
saved/synchronization/items. A new list changes only list/status/error/call count.
No operation can claim synchronized, remote complete, provider compatibility or
production integration. Replacing this adapter later still requires authorized
provider evidence/tests for version, auth, errors and persistent effects.
