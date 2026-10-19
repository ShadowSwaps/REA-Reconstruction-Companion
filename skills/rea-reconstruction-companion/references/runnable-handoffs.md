# Hand over a runnable result

Use when delivering an implementation that the user is meant to run. Match the
selected scope and mode: a function may need one invocation and its inputs; a
specification-only task needs proposed prerequisites and remaining work, without
claiming or starting an implementation. Extend the existing README/result rather
than require a separate report or installation manual for every task.

Give the user enough to reproduce the selected outcome:

- Actual prerequisites and supported/tested platform or shell, versions,
  configuration, accounts, fixtures and necessary artifacts. Distinguish existing
  tools from anything still missing. For a missing prerequisite, give the next
  action or supported alternative; do not acquire software or invent access.
- Exact working directory and setup, run, readiness and stop instructions. Say
  whether this is a batch command, library, UI or long-running process. Explain
  relevant exit codes and errors; a process exit can still contain failed actions.
- A short principal walkthrough with concrete inputs and observable expected
  results, including save/reopen when applicable. Locate persistent data and
  distinguish it from drafts, caches, seeds, fixtures and remote state.
- Safe backup, reset and recovery boundaries. Check resolved owned paths and
  links before cleanup, preserve prior data and unknown files, and explain what
  can be lost. Never stop unrelated processes or use real user data for a reset
  demonstration. Do not imply crash durability from a caught-write failure.
- Status of the selected workflows: working and actually exercised, local
  substitute, finite replay, incomplete, blocked or unverified. Keep hard remote
  requirements pending; a local walkthrough cannot establish global parity.

Before calling the handoff runnable, follow the written steps from an owned fresh
directory containing only the documented necessary artifacts. Use deterministic
owned data; check startup, the principal workflow, persistence/reopen, relevant
errors and recovery. Record hidden checkout paths, environment variables, private
fixtures or accounts the instructions depended on and correct demonstrated gaps.
If a new prerequisite exceeds the authorized scope, checkpoint the exact blocker
and next action instead of silently installing it or expanding the build.

Record which steps ran, actual prerequisites and failures/unrun cases in the
existing result. A fresh directory on the same environment is neither a clean OS
nor an independent beginner test. Disclose prior source exposure and same-agent
authorship; keep historical reference comparisons tied to their original evidence.
Do not infer model comprehension, platform coverage or time/token savings.
