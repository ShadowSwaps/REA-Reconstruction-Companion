# Observed workflow trial — 2026-10-16

This is an agent-observed, source-available Pocket Tasks trial using companion
commit `37fed47d706846466c5ad5511283b388b4d28bb6`, not an independent or blind
benchmark. The host could access the checkout. Before implementation, the agent
read the procedure (including its descriptions of checker categories), task,
preparer, target source and relevant skill references. It did not read the
reviewer corpus or worked answers. After the first checker report, it inspected
the checker implementation to investigate failures. Later repository regression
checks are maintainer validation, not additional reconstruction trials.

The requested host settings were Sol, Medium reasoning and Standard speed. No
settings were changed. Existing Node `v24.21.0` and configured local REA tools
were used; no dependencies, extra agents, paid APIs, active skill updates or
account changes were initiated. Installer regression checks used disposable
fixtures. Other live reconstruction models, hosts and runtime versions were unrun.

## Evidence and outcomes

The frozen target file SHA-256 was
`8ad2586a3adb43e19c55ead2999346ccbd416d0559226046aa0738bab188afb7`.
The candidate file SHA-256 was
`2a045a9a92e1e34fd8fcc98293118998107e7ffd98054ecfd08f8ea94549a8ac`.
Packet verification passed before investigation and after reconstruction against
the unchanged trusted package. The original packet and private audit outputs
remain separate from this repository; the later task wording change does not
retroactively change the trial identity.

REA `analyze_javascript_application` analyzed the single packet source as inert
text. Parent evidence ID:
`ev_7657dbfb46d441372791fbb7fb302ce882799a6df6355054b2e2788ae1ca7669`.
It reported one parsed source, no parse failures, and 230 semantic unknowns.
Application inventory coverage was complete, while semantic coverage remained
unknown/partial. The retained evidence bundle is private because it contains
local paths. No REA runtime instrumentation or global equivalence claim follows
from that static analysis.

Four initial command sequences with restart observations established positional
selection through filtering, save/cancel behavior, error responses, and empty
store handling. A pre-implementation checkpoint linked five requirement groups
to these observations and target source locations. The separately authored
candidate used a command dispatch table and filesystem adapter, with no runtime
reference import or invocation. The agent inspected code and its exact launch
boundary before execution; human review remains pending.

Thirty differential cases passed: the four recorded sequences, six boundary or
invalid-input cases, and twenty deterministic 48-command sequences (LCG seed
`0x102016`). This is bounded comparison coverage, not exhaustive parity. A real
candidate process was terminated before the parent sent EOF, after the parent
wrote partial JSON to its input pipe. It produced no completed result and left
the previously saved store hash unchanged. The trial did not establish how far
the child had read or whether its command loop had started. A fresh invocation
against that store saved a subsequent edit. This controlled interruption does
not establish interrupted validation recovery, host-context restoration,
power-loss recovery or crash durability.

A separate disposable version 1.0.1 changed the startup seed title Alpha to
Delta. The old candidate mismatch was retained before adapting the candidate.
Fresh startup/edit/cancel/save comparisons then passed. Imported-store command
comparisons remained equal. Startup and dependent integration claims were
revalidated; original version 1.0.0 evidence was preserved as history.

## Demonstrated instruction weaknesses

1. The task required human review before every checker run, while the procedure
   and implementation workflow allowed code inspection under the current user's
   authorization. The trial's explicit authorization took precedence. The task
   now requires inspection and preserves actual human/host approval boundaries
   without introducing an unconditional additional gate.
2. The checker initially reported 10 passing, 4 failed and 2 unrun sessions. The
   unchanged reference self-check reproduced the same pattern. A reduced local
   filesystem probe returned `EPERM` on rename in the default temporary parent.
   With a process-scoped writable temporary parent, both unchanged commands
   passed all 16 sessions. The procedure now explains how to diagnose this
   environment failure, preserve reports and bind fresh results to new conditions
   without changing expectations or broadening permissions. The exact cause of
   the host's rename restriction was not established.

The comparison corpus hash was
`b7855eb49da06722fa94c914d39eb6933a8eec4022742fea4d0b4440d46d0bdc`.
Review found that the private differential runner compared exit statuses without
requiring each case's expected status, so matching process failures could have
been counted as agreement. Inspection of the saved cases confirmed the expected
statuses and response counts in all thirty; a guarded follow-up replay is
recorded separately in the private audit. This does not change the original
reports or constitute a new blind trial. The reference's original restricted-temp
self-check and reduced rename diagnostic were captured in the tool trace, rather
than saved as standalone report files; fresh evidence must not be relabeled as
those original observations.

The private audit preserves original and fresh reports, candidate bytes,
probe inputs, pre-implementation checkpoint, interruption and component-change
records. No benchmark score, clean-room result, cross-model certification,
production readiness, human approval, merge or release is claimed.
