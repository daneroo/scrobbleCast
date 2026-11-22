# Agent instructions

`site/` is the Scrobble Cast web app, where active work happens. See `site/README.md` to run and deploy it. Repo-wide docs (`docs/`, `thoughts/`, `GLOSSARY.md`, this file) live at the root.

Until the planned migration, leave these alone unless explicitly asked:

- `js/` is the scraper, a critical production app running live in the homelab. Take care: don't edit it, run its commands, or read its credentials without explicit direction.
- `web/`, `scrub/`, `history/`, `archive-historical/` and `assets/` are older projects and archives.

`thoughts/` is the idea inbox (`BACKLOG.md`, one theme per area, e.g. `## site`) plus companion files for GitHub issues. Workflow: [docs/workflow.md](docs/workflow.md).

## Agent skills

### Issue tracker

GitHub Issues on `daneroo/scrobbleCast`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles, each label string equal to its role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.
