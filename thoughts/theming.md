# Theming: the plan

Working notes for the `theming` and `layout` backlog items. Delete once the work is done and what's still true lives in `site/`, `docs/` or an ADR.

## What we're building

The site gets **four themes** (pantone, chromatic, sketch, prosodio), **each with a light and a dark mode**. The reader picks the mode (light, dark or system) and the theme. Not every theme may prove fit for purpose and the values will change, but this is the system: every theme is light and dark, and themes are independent of each other.

## Three layers

1. **Roles** (the contract): the variable names in `site/src/theme.css` (`--background`, `--card`, `--header`, …). Names follow shadcn where one fits.
2. **Themes** (values): each theme fills in the roles, for light and dark. A theme never adds a role.
3. **Components and layout** (consumers): use only roles, never a colour. A new component colour adds one role, pointing at an existing role by default so no theme breaks.

The role list is the only link, so themes and layout iterate separately. Rules carried forward:

- Subtle colours are derived from roles (`color-mix(in oklch, …, var(--surface))`), not given values, so they work in dark mode.
- Components that share a colour still get their own role (`--hero: var(--tint)`), so they can diverge.
- A relationship is a reference, not a copy: "the header is the page" is `--header: var(--background)`.

## Three merges to `main`

### 1. Exploration: merge now, no spec

Branch `theming`. Merges as is; the default look is unchanged.

- Every colour as a role in `theme.css`; `styles.css` uses only roles (`dfa03d8`, already on `main`).
- The four themes as trials, picked by URL: `?theme=<name>&mode=dark`.
- `/theme-study.html`: every theme, light and dark, side by side on real pages, with swatches read from the frames.

`theme.css` is permanent. Two pieces are temporary scaffolding and go out with the next production deploy:

- The URL switch (the inline script in `site/index.html`): removed in stage 2, when the switcher replaces it.
- `site/public/theme-study.html`: kept while themes are tuned; removed once they settle, at the latest when stage 3's layout spec ships.

### 2. Tailwind port and theme switcher: spec required, own branch

The smallest piece of finished work that stands on its own, and the base for stage 3. `/grilling` → `/to-spec` (parent issue) → `/to-tickets`, then one branch.

Goals, each serving a later stage:

- **Components don't know about themes or modes.** They name roles only: no per-mode variants or conditionals in markup. So stage 3's prototypes are written once and work in every theme and mode.
- **A theme is one readable unit.** Its light and dark values sit where they can be compared and edited together, and a theme or role is added in one place. So tuning stays values-only and cheap.
- **The port changes nothing visible.** It's a refactor; screenshots prove it, as in step 1. So any later change in look is deliberate.
- **The switcher is a finished feature**: accessible, saved, no flash of the wrong theme. So stage 2 ships something users see and keeps.

The spec chooses the techniques and justifies them against these goals. Likely tickets:

1. Port all of `styles.css` to Tailwind v4, the roles usable as Tailwind utilities. No visual change: before/after screenshots must match.
2. Restructure the themes to meet the first two goals; settle the header roles.
3. The theme switcher: a light/dark/system control and a theme menu, saved, no flash of the wrong theme on load. Plain HTML and Tailwind, no component library. It replaces the URL switch in `index.html`.
4. An ADR in `docs/adr/`: Tailwind adopted; component library deferred to stage 3.

### 3. Layout: prototypes, then a spec

`/prototype`: structurally different versions of real pages with `?variant=`, in Tailwind, built from roles. They show what the UI needs; that is when we pick a component library, if we need one (and look at TanStack Table for the tables). Prototypes are throwaway and don't merge. The winners become a spec ("port layout X"), implemented on its own branch and merged. That spec also deletes `theme-study.html` if it's still there, and this file once what's still true has moved to `docs/` or an ADR.

## When a spec is needed

- **Spec**: a change to the stack or the app's structure, or a user-facing feature (stages 2 and 3).
- **No spec**: exploration (study pages, URL-only trials) and theme tuning (values in `theme.css` only). Tuning can happen alongside any stage, on any branch.

## Grilling brief: stage 2

**Subject**: port `site/` to Tailwind v4 with no visual change, then build the theme switcher (light/dark/system and the four themes) on it. Tailwind is decided. The spec comes out of this session.

**Out of scope**: component libraries (stage 3 decides, after the prototypes), layout and redesign, tuning theme values.

**Questions to settle**

1. Pass criteria. Proposed: before/after screenshots match on the default theme; the switcher is keyboard-accessible, saved per device, with no flash on load; `vp dev`/`build`/`test` and typecheck pass.
2. Preflight (Tailwind's reset): include it and fix what it changes, or leave it out?
3. How far to go: Tailwind utilities in the components (remove `styles.css`), or keep some CSS for what utilities say badly (the brand-mark mask, the table)?
4. How a theme expresses its two modes, and how the page switches between them, judged against the stage's goals (no mode conditionals in components; a theme as one readable unit). Candidates include one block per mode (today) and `light-dark()`; any choice needs proof that it works with the roles we derive with `color-mix()`.
5. The switcher: shape and placement (a mode button and a theme menu in the header?); defaults (pantone + system?); saved in `localStorage`, applied before first paint.
6. `?theme=`/`?mode=`: keep as an unsaved override while the study page needs it?
7. The header bar: follow the page, inverted (the theme's ink), or the hero tint? Decide by eye on the study page.
8. Fixed-colour images (the tiled logo in the hero and artwork placeholder): leave, or recolour per theme?
9. Spec and branch name.

**Facts already looked up (2026-11-24)**

- Tailwind v4 in Vite: `tailwindcss` and `@tailwindcss/vite`, then `@import "tailwindcss"` in the CSS. `@tailwindcss/vite` supports Vite 8; vite-plus's docs say nothing about Tailwind (untested, not known broken).
- Preflight would change today's look: it removes link underlines, list bullets and default margins, makes images block, and resets button and input styles. It can be left out by importing only Tailwind's theme and utilities. ([preflight](https://tailwindcss.com/docs/preflight))
- `light-dark()` (a candidate for question 4): Baseline widely available (Chrome 123, Firefox 120, Safari 17.5 incl. iOS). Needs `color-scheme` on the element; a class or attribute toggle must set `color-scheme` too. Unverified: whether it works inside `color-mix()`, which several of our roles use. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark))
- im-qcic runs Tailwind v4 (plain Vite 8) with roles through `@theme inline`, `data-theme` plus a `.dark` class, and plain-button toggles (`im-qcic/v2/apps/web/src/theme.css`, `theme.ts`, `components/ThemeToggle.tsx`).

## Browser chrome

- Set the page background on `html` **and** `body`: Safari 26 (iOS, iPadOS, macOS) ignores `theme-color` and the manifest's `theme_color`, and tints its bars from the `body` background (or a fixed/sticky element touching the top edge; bottom bar needs `viewport-fit=cover`). Our header isn't sticky, so Safari shows the page colour, not the header's.
- Keep `theme-color` with light/dark variants (`media="(prefers-color-scheme: …)"`) for Chrome on Android; a user toggle must update it by script.
- Test on iPhone and iPad.

## Sources

- `assets/logo/study.html`: the logo's colourways.
- im-qcic `chromatic` (midnight and rust swap roles by day and night) and `sketch` (monochrome, one red); its two-axis switch (theme and mode, both saved, set before first paint) in `theme.ts`.
- Prosodio's logo colours: `ai-garden/prosodio/packages/logo/colors.ts`.
