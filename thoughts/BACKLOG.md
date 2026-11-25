# BACKLOG

Idea inbox, grouped by theme: snippets worth not forgetting, not yet worth an issue. Promote to a GitHub issue, then delete the line. Rules: [docs/workflow.md](../docs/workflow.md).

## site

Items for the web app in `site/`.

- [ ] layout — design sessions with `/prototype`: structurally different versions of a real page, switched with `?variant=`, one page per session, each on the `prototype/layout` branch (never merges).
  - Done: the books list (verdict: `site/src/books.prototype.md` on `prototype/layout`).
  - Still to do: the podcasts and episodes lists (they should reuse the books list's query model), home (the books journal overlaps it), and the detail pages.
  - Component library: none so far; the books list needed neither one nor TanStack Table (see [ADR 0001](../docs/adr/0001-tailwind-no-component-library.md)). Recheck after the remaining pages. Revisit the header bar.
- [ ] theme-tuning — tune the four themes' values in `site/src/theme.css` (no spec needed); palette sources: the logo study's colourways (`assets/logo/study.html`), im-qcic's chromatic and sketch, Prosodio's logo colours (`ai-garden/prosodio/packages/logo/colors.ts`). Leftovers from #82:
  - The warning notice mixes to a purplish tone in chromatic dark.
  - The trial themes repeat literal values where a role reference would do (e.g. chromatic light's link, accent, primary and header are all `#1b3a6b`).
  - Revisit the brand mark: it colours the icon SVG by using it as a CSS mask over `bg-header-mark` (`site/src/layout.tsx`). Acceptable for now, but not the way we want to colour the logo; e.g. an inline SVG with `currentColor`, or the parametrised logo. In forced-colors mode the mask makes it disappear (possible stopgap: `forced-color-adjust: none`).
  - The theme button's dot uses the header-mark colour (`--switcher-dot`); recheck once we know how many themes we keep.
  - The browser bar colours in `site/src/theme.ts` copy each theme's header; keep them in step.
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
