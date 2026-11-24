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

- The URL switch (the inline script in `site/index.html`): removed by the stack spike, when the switcher replaces it.
- `site/public/theme-study.html`: kept while themes are tuned; removed once they settle, at the latest when stage 3's layout spec ships.

### 2. Stack spike: spec required, own branch

`/grilling` → `/to-spec` (parent issue) → `/to-tickets`, then one branch for the spec. The test feature is the **theme switcher**: a light/dark/system toggle and a theme menu, saved, with no flash of the wrong theme on load. It needs accessible menus and state, which is what tests a component library, and it ships either way. Likely tickets:

1. Tailwind v4 with the roles exposed through `@theme inline`; no visual change (before/after screenshots).
2. Each theme as one block with `light-dark()`, `color-scheme` on `html`; settle the header roles.
3. shadcn set up; the theme switcher built with it. It replaces the URL switch in `index.html` (remove the script; `?theme=` may survive as a way to share a theme, if the switcher reads it).
4. One real page (books or home) ported to Tailwind utilities, to feel the day-to-day cost.
5. An ADR in `docs/adr/` recording the stack decision.

Merge if the stack works out. If not, the ADR records "no, and why", and the switcher ships in plain CSS.

### 3. Layout: prototypes, then a spec

`/prototype`: structurally different versions of real pages with `?variant=`, on the chosen stack, built from roles. Prototypes are throwaway and don't merge. The winners become a spec ("port layout X"), implemented on its own branch and merged. That spec also deletes `theme-study.html` if it's still there, and this file once what's still true has moved to `docs/` or an ADR.

## When a spec is needed

- **Spec**: a change to the stack or the app's structure, or a user-facing feature (stages 2 and 3).
- **No spec**: exploration (study pages, URL-only trials) and theme tuning (values in `theme.css` only). Tuning can happen alongside any stage, on any branch.

## Open questions for the spike's grilling

- **Header**: today a fixed dark blue in every theme, so it looks disconnected. Same as the page, inverted (the theme's ink), or the hero tint? Express it as a role reference.
- **`light-dark()`**: one declaration per role for both modes, driven by `color-scheme` (`light dark` = system). Check browser support first.
- **Stack**: Tailwind v4 + shadcn is the lean (im-qcic already runs Tailwind v4 with roles through `@theme inline`: `im-qcic/v2/apps/web/src/theme.css`, `theme.ts`). Check shadcn's current setup before committing. Full frameworks (MUI, Mantine, Chakra) bring their own theming and would fight the roles.
- **Fixed-colour images**: the tiled logo (hero, artwork placeholder) has baked-in colours that may clash with the non-pantone themes.
- **Scales**: radii (8 values), font sizes (12) and spacing (36) become scales during layout work, since normalising them changes the look.

## Browser chrome

- Set the page background on `html` **and** `body`: Safari 26 (iOS, iPadOS, macOS) ignores `theme-color` and the manifest's `theme_color`, and tints its bars from the `body` background (or a fixed/sticky element touching the top edge; bottom bar needs `viewport-fit=cover`). Our header isn't sticky, so Safari shows the page colour, not the header's.
- Keep `theme-color` with light/dark variants (`media="(prefers-color-scheme: …)"`) for Chrome on Android; a user toggle must update it by script.
- Test on iPhone and iPad.

## Sources

- `assets/logo/study.html`: the logo's colourways.
- im-qcic `chromatic` (midnight and rust swap roles by day and night) and `sketch` (monochrome, one red); its two-axis switch (theme and mode, both saved, set before first paint) in `theme.ts`.
- Prosodio's logo colours: `ai-garden/prosodio/packages/logo/colors.ts`.
