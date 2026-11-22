# BACKLOG

Idea inbox, grouped by theme: snippets worth not forgetting, not yet worth an issue. Promote to a GitHub issue, then delete the line. Rules: [docs/workflow.md](../docs/workflow.md).

## site

Items for the web app in `site/`.

- [ ] data-loading — the home page downloads the whole 3 MB books feed just to count books. Load less, or precompute counts.
- [ ] footer-freshness — the footer time should say when the data on screen was generated or fetched. For now it shows when the page content last changed.
- [ ] theming — light/dark themes, maybe with Claude Design; maybe move to Tailwind.
- [ ] tanstack-start — server rendering would make a "generated at" time meaningful again.
- [ ] history-api-params — the old app sent `ts` (cache busting) and `origin` to the history API. Decide whether we need them.
- [ ] search-threshold — the Fuse threshold (0.4) is shared by books, podcasts and episodes; tune per collection if needed.
- [ ] versioning — the old app was v10.0.6, the new one starts at 0.1.0. Pick a scheme.
- [ ] lint-test-ci — add markdownlint (see `ai-garden/prosodio/.markdownlint-cli2.jsonc`), code lint/format and tests, behind one `ci` script run before deploys. Vite+ is new to us; start from what `vp` provides (`vp check`, `vp lint`, `vp fmt`, `vp test`, `vp hooks`/`vp staged`).
  - Formatting: `vp fmt` (Oxfmt, Prettier-compatible) formats code and Markdown. Today all 11 code files fail `vp fmt --check` only on semicolons and quotes; adopting the defaults (as in prosodio) is one format-only commit.
  - Markdown: Oxlint doesn't lint Markdown, so markdownlint is still needed (e.g. bare URLs).
  - Editor: Vite+ recommends the Vite Plus Extension Pack (Oxc + Vitest) for VS Code; keep the markdownlint extension for Markdown.
- [ ] vercel-cache-dir — drop the `npm_config_cache_dir` unset in `vercel.json` once Vercel fixes the bug.
