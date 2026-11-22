# Backlog

Half-baked ideas, not yet issues.

- **Data loading**: the home page downloads the whole 3 MB books feed just to count books. Load less, or precompute counts.
- **Freshness**: the footer time should say when the data on screen was generated or fetched. For now it shows when the page content last changed.
- **Theming**: light/dark themes, maybe with Claude Design; maybe move to Tailwind.
- **TanStack Start**: server rendering would make a "generated at" time meaningful again.
- **API parameters**: the old app sent `ts` (cache busting) and `origin` to the history API. Decide whether we need them.
- **Search**: the Fuse threshold (0.4) is shared by books, podcasts and episodes; tune per collection if needed.
- **Version**: the old app was v10.0.6, the new one starts at 0.1.0. Pick a scheme.
- **Repo setup**: AGENTS.md and a development process.
- **Vercel workaround**: drop the `npm_config_cache_dir` unset in `vercel.json` once Vercel fixes the bug.
