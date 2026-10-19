# Observations and evidence limits

The runtime report is [worked-result.json](worked-result.json), produced by the
documented local batch command after the baseline/literal freeze. The seven
focused tests exercise that trial and six faulty variants: ignored completion,
lost Unicode, lost custom listing, removed lossy-export guard, swallowed save
failure and no-op writes. Each defect must fail an assertion at the selected
boundary; exceptions/timeouts are not counted as caught semantic defects.

Changed completion, clearing/no-op behavior, invalid IDs/types, stored fields,
export representability and retry/reopen are exercised through the library API.
Retained imports/export readers, custom listing, explicit migrate, late rejection
and old-code readback have fresh checks. Earlier reference/schema observations
remain historical for their own identities. The dependency map and affected/
retained selections are manual judgments, not outputs of an impact engine.

Manual contextual review (authored cases; no model/agent run):

| Current wording and context | Expected scoped decision | Evidence boundary |
| --- | --- | --- |
| “Let me mark one entry done; keep my title listing and old files.” Current source already supports schema2 and a custom listing, older blueprint only describes schema1. | Edit current reconstruction; retain custom work, reuse validated save, test lossy export/reopen; don't regenerate the old blueprint. | Demonstrated by the Node fixture; intent interpretation is manual. |
| “Explain how I could add undo someday; no code yet.” | Stay in understand/specify; describe affected history/data contracts without implementing. | Manual mode/negation review only. |
| “Actually keep the file format; just rename the visible action.” | Honor correction, inspect shared UI callers; no forced migration or data backup for a no-op. | Manual scenario; no UI trial here. |
| “Use release 3 now” with newly supplied reference bytes. | Establish reference identity/observed changes; use version-change evidence applicability rather than pretend this is only a user preference. | Manual scenario; no release3 supplied or tested. |
| Same app bytes but changed storage/runtime settings. | Reassess relevant environment-dependent results and retain independent facts; don't infer behavioral equality from app hashes. | Manual scenario; measured environment example is separate. |
| “Make it better” could mean changing the selected reconstruction or installed reference. | Resolve the consequential target/outcome ambiguity before mutating either; continue independent inspection. | Manual scenario; no mutation authority inferred. |
| New feature works but a retained export or custom list fails. | Report failure and fix within scope; do not claim completion from feature success. | The actual faulty-variant assertions demonstrate selected failures. |

Same-agent authorship/review and source exposure apply to all of this example.
Literals are independent of candidate outputs, not independently authored or
held out. A frozen hash detects drift, not truth or complete coverage. This is
not evidence of arbitrary model comprehension, real user acceptance, third-party
product parity, crash recovery, transactions or compatibility beyond these cases.
