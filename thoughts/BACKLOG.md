# BACKLOG

Idea inbox, grouped by theme: snippets worth not forgetting, not yet worth an issue. Promote to a GitHub issue, then delete the line. Rules: [docs/workflow.md](../docs/workflow.md).

## site

Items for the web app in `site/`.

- [ ] theming — plan and colour inventory: [theming.md](theming.md). A design session for colour and type, following the 2026 logo (`assets/logo/study.html`: its colourways and lockups). Decide whether the site keeps the four 2015 colours or moves to the logo's two (Marsala and Dusk Blue survive only as card borders and focus ring); light/dark themes; maybe Tailwind.
- [ ] layout — a design session with `/prototype`: structurally different versions of a real page (home, a list, a detail), switched with `?variant=`.
- [ ] tanstack-start — server rendering would make a "generated at" time meaningful again.
- [ ] history-api-generated-at — the history API returns a bare array with no generation time. Have it say when the scraper last ran (e.g. `Last-Modified` or an envelope) so the footer can show it.
- [ ] history-api-params — the old app sent `ts` (cache busting) and `origin` to the history API. Decide whether we need them.
- [ ] rich-descriptions — show book and podcast descriptions as sanitized HTML (e.g. DOMPurify); keep indexing plain text for search.
- [ ] search-threshold — the Fuse threshold (0.4) is shared by books, podcasts and episodes; tune per collection if needed.
  - Fuse matches only near the start of a field (default `location`/`distance`): "Treasury officer", mid-description, finds nothing, on production too. Try `ignoreLocation: true`.
- [ ] versioning — the old app was v10.0.6, the new one starts at 0.1.0. Pick a scheme.
- [ ] lint-test-ci — add markdownlint (see `ai-garden/prosodio/.markdownlint-cli2.jsonc`), code lint/format and tests, behind one `ci` script run before deploys. Vite+ is new to us; start from what `vp` provides (`vp check`, `vp lint`, `vp fmt`, `vp test`, `vp hooks`/`vp staged`).
  - Formatting: `vp fmt` (Oxfmt, Prettier-compatible) formats code and Markdown. Today all 11 code files fail `vp fmt --check` only on semicolons and quotes; adopting the defaults (as in prosodio) is one format-only commit.
  - Markdown: Oxlint doesn't lint Markdown, so markdownlint is still needed (e.g. bare URLs).
  - Editor: Vite+ recommends the Vite Plus Extension Pack (Oxc + Vitest) for VS Code; keep the markdownlint extension for Markdown.
- [ ] vercel-cache-dir — drop the `npm_config_cache_dir` unset in `vercel.json` once Vercel fixes the bug.
