# wealth-advisor conventions

This repo hosts a collection of independent finance agents, one per folder
under `agents/`. Each agent folder is self-contained:

- `CLAUDE.md` — the agent's job, run each time a session wakes for it
  (interactively or via a scheduled Routine).
- `reports/` — dated output (`YYYY-MM-DD.md` or similar), committed by the
  agent itself after each run.
- `scripts/` — helper code for data sources that aren't available as an
  MCP connector (called via Bash during a run).

When adding a new agent, follow this same layout and link it from the root
README.
