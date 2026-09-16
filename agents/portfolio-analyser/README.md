# portfolio-analyser

Reconciles Interactive Brokers positions and performance against Sharesight,
and publishes a dated report to `reports/`.

See `CLAUDE.md` in this folder for what the agent does on each run.

## Layout

- `CLAUDE.md` — run instructions for the agent
- `scripts/sharesight_client.py` — minimal Sharesight REST API client
- `reports/` — one file per day, e.g. `reports/2026-09-16.md`
