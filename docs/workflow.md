# Workflow

Idea -> issue -> spec -> tickets -> implement -> done.

- Idea: a line in `thoughts/BACKLOG.md`.
- Issue: promoted to GitHub Issues (`daneroo/scrobbleCast`) when worth tracking.
- Spec: `/grill-with-docs` sharpens it, `/to-spec` publishes it as a parent issue.
- Tickets: `/to-tickets` splits the spec into child issues (sub-issues with blocked-by edges). "Ticket" always means a GitHub child issue.
- Implement: `/implement` works one ticket.

Tracker conventions: `docs/agents/issue-tracker.md` (written by `/setup-matt-pocock-skills`). Everything in `thoughts/` is transient except `BACKLOG.md`.

Filenames in `docs/` and `thoughts/` are lowercase kebab; only `README.md`, `BACKLOG.md` and `GLOSSARY.md` are capitalized.

## Backlog: `thoughts/BACKLOG.md`

An idea inbox: snippets worth not forgetting, not yet worth an issue. Grouped by theme (`## site`, …); themes are the only structure. A theme may name the subfolder it is about.

```md
- [ ] <id> — <imperative title>; <a few lines max>
```

- `<id>`: lowercase kebab slug, unique within the file.
- Promotion: open a GitHub issue, then delete the line. The issue is the record; git keeps the rest.
- No scheduling and no closed history here; both live in GitHub.

## Working files: `thoughts/`

GitHub issues carry the work: specs are parent issues, tickets are sub-issues, progress is issue state. `thoughts/` holds only what doesn't fit in an issue body: research notes (`/research`), questionnaires, design drafts.

These files are volatile. A file usually lives as long as its ticket or set of tickets, though not always.

- One flat folder. Name files `<issue#>-<slug>.md` when tied to an issue (the parent, for a set of tickets), else `<slug>.md`.
- Link the file from its issue.
- When the work is done, move what's still true into `GLOSSARY.md`, `docs/adr/` or `docs/`, then delete the file. Git keeps history.
