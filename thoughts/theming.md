# Theming: plan and colour inventory

Working notes for the `theming` and `layout` backlog items (2026-11-23). Delete once the work is done and what's still true lives in `site/` or `docs/`.

## Order

1. **Extract** (refactor, no visual change): every colour into role variables in a new `site/src/theme.css`; `site/src/styles.css` uses only the role names (no hex, no `white`/`black`). Check with before/after screenshots of each page (home, books, podcasts, episodes, the three detail pages, a notice); they must match. One commit.
2. **Theme design**: palettes, each light and dark, compared on the real pages with `?theme=` (maybe a style-guide page like `assets/logo/study.html`). Only `theme.css` values change. Adds the light/dark switch (system setting, maybe a toggle).
3. **Layout**: `/prototype`, structurally different versions of a real page with `?variant=`, built from the roles. A new component colour adds one role to `theme.css`.

Then iterate: each change touches one side; the role list is the only link.

## Status (2026-11-24)

- Step 1 done (`dfa03d8`). Step 2 under way on branch `theming`: four palettes in `theme.css` (pantone, chromatic, sketch, prosodio), each light and dark, picked with `?theme=&mode=`; compared on `/theme-study.html` (dev server).
- Plan: keep all four in the app, with a light/dark/system toggle and a palette switcher (icon).
- Open: the header bar looks disconnected (a fixed dark blue in every palette). Options: follow the page; the palette's own ink, inverted; the hero tint. Express "same as page" or "inverted" as references to other roles (`--header: var(--foreground)`), not new values.
- Open: one declaration per role for both modes with `light-dark(light, dark)` plus `color-scheme` on `html` (`light dark` = system). Would halve each palette and give system mode for free.

## Decisions

- Plain CSS variables, no new stack. Role names follow shadcn (`--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--accent`, `--ring`, …) so a later move to Tailwind/shadcn is mostly renaming.
- Two layers: the brand palette (the four 2015 Pantone colours, by name), then roles pointing at it.
- Step 1 extracts colours, the shadow and the font family. Radii (8 values), font sizes (12), spacing (36) become scales during layout work, since normalising them changes the look.
- Subtle colours are derived from roles, not given values: tints and the table stripe as `color-mix(..., var(--surface))`, not `white`, so dark mode works. Step 1 keeps `in srgb` (pixel-identical); switch to `in oklch` in step 2.
- Component roles that today share a colour get their own name pointing at it, so they can diverge: `--hero: var(--tint)`, info notice likewise.
- Not a cross-app template; what carries over to other apps is this vocabulary and order (maybe as a skill later).

## Colour inventory (`styles.css`, `index.html`)

- **Page and text**: page `#f5f8fa` (on `:root`); text `#122c44`; muted `--muted` `#4b6074` (footer, counts, notes, metadata, card labels, loading, stat labels); links classic blue; hero subtitle `#2c526b` (one-off).
- **Surfaces**: raised `white` (cards, table, empty/error boxes, stat boxes, inputs/selects); tint `--dusk-tint` = `color-mix(in srgb, dusk-blue 19%, white)` (hero panel, table heading row, artwork box, info notice); border `--line` `#d5e0e8`; table stripe `#f8fbfd`; card hover shadow `#0b3d6614`.
- **Accent and actions**: classic blue for card titles, table heading buttons, hero title, detail byline; primary button classic blue / white, hover `color-mix(classic-blue 80%, black)`; checkbox `accent-color`; input border `#9eb2c3` (darker than `--line`: an `--input` role).
- **Focus**: marsala; sandstone inside the header.
- **Header (inverse area, blue in both modes)**: background classic blue, text white, nav hover `#ffffff18`, active underline dusk blue, mark sandstone (CSS mask of `scrobble-cast-icon.svg`).
- **Status**: info notice = tint; warning = `color-mix(sandstone 22%, white)`; dismiss hover `#00000014` (overlays must flip in dark).
- **Categories**: home card top borders, books sandstone, podcasts marsala, episodes dusk blue. Only used there; give them roles (`--books`, …) and dark variants.
- **Outside CSS**: `<meta name="theme-color" content="#1d4e89">` in `index.html`; no `color-scheme` declared (native controls stay light in dark); fixed-colour images: tiled logo (hero, artwork placeholder), book and podcast covers.

## Browser chrome

- Set the page background on `html` **and** `body`: Safari 26 (iOS, iPadOS, macOS) ignores `theme-color` and the manifest's `theme_color`, and tints its bars from the `body` background (or a fixed/sticky element touching the top edge; bottom bar needs `viewport-fit=cover`). Our header isn't sticky, so Safari shows the page colour, not the blue.
- Keep `theme-color` with light/dark variants (`media="(prefers-color-scheme: …)"`) for Chrome on Android; a user toggle must update it by script, and set `color-scheme` on `html`.
- Test on iPhone and iPad. (Prosodio's white bar has the same cause: no `body` background.)

## Related

- `assets/logo/study.html`: the logo's colourways (2015 Pantone, Paper & ink, Prosodio sepia & cream, Prosodio midnight & rust), a starting point for palettes.
- The site already uses the 2026 logo: `site/public/scrobble-cast.svg` (tile), `scrobble-cast-icon.svg` (bare; header mask, favicon).
