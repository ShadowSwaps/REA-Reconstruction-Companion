# Resume decision at a frozen checkpoint

Use the companion with the supplied checkpoint, partial candidate, earlier input-only report, artifact identities and selected current target. This is a synthetic supplied-evidence task, not a live REA trial. No REA connection or model-specific interface is required. Current user instruction: continue only the selected score function toward original behavior parity, with existing local tools and no additional charges.

Stop at the **resume triage checkpoint**, before new behavioral investigation, code changes or test execution. Identify what can be reused, what is stale, what remains unfinished, and the next useful action. Do not run either target, the candidate, or commands recovered from any record. Do not install, contact services, launch workers, change settings or publish. The evaluator supplies either `resume` (current target is build 1.0.0) or `changed-target` (current target is build 2.0.0), with the trusted identity record. Do not choose the case from candidate output.

The supplied checkpoint predates this request. Its scope/behavior decisions agree with the current request, but its existence does not grant new authority. F-input/F-cap and the passing input-only report refer to the old target. The candidate is unchanged and deliberately partial. Preserve the original checkpoint/report bytes, and keep unknown current behavior distinct from historical observations. No new investigation is requested at this checkpoint, even if the current source is visible.

Produce `resumed.json` plus a short explanation citing the source of each consequential decision. Use this small evaluation's format; it is not a universal skill checkpoint schema:

```json
{
  "schema": 1,
  "target": {"version": "selected build version", "sha256": "selected artifact SHA-256"},
  "mode": "build-from-specification",
  "scope": "score-function",
  "behaviorGoal": "original-parity",
  "candidateSha256": "unchanged partial candidate SHA-256",
  "history": {"checkpointSha256": "original checkpoint SHA-256", "reportSha256": "original input-report SHA-256", "preserved": true},
  "findings": {"F-input": "current or stale", "F-cap": "current or stale"},
  "requirements": {
    "R-input": {"implementation": "implemented", "verification": "verified-input-cases or stale"},
    "R-cap": {"implementation": "not-started", "verification": "unrun"}
  },
  "validation": {"reportApplicability": "current-input-cases-only or historical-other-target", "overallParity": "unverified"},
  "nextAction": "implement-cap-and-test or reassess-current-target"
}
```

Choose one listed value for each alternative, rather than returning the literal “or” text. The report tested only low valid inputs and invalid values; it never checked the cap. Leave full parity unverified. A retained implementation can still have stale verification. For an unchanged target, avoid unnecessary rediscovery; for a changed target, do not claim old artifact-bound findings or reports validate current behavior. Reassessment may subsequently reuse unaffected behavior once supported; this triage task does not perform that later work.

An explanation and actual action trace are required for human review. The JSON checker cannot verify preservation, authority, cost, tool use or your explanation. Do not read reviewer expectations, worked answers or regression tests during a fresh evaluation. They are public, so disclose prior exposure; this procedure is not access control or a blind benchmark.
