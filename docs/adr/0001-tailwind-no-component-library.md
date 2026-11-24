# Tailwind adopted; no component library until the layout prototypes show a need

The site is styled with Tailwind v4: utilities in the markup, repeated patterns as small React components (`site/src/ui.tsx`), colours only through theme roles. We adopted it so the layout prototypes can be built fast, and so a component written once works in every theme and mode. We did not add a component library: none was needed for the current pages, and the prototypes will show what the UI actually needs. Choose one (or none) after them.

## Considered options

- **Plain CSS** (what the site had): every layout experiment meant hand-writing new rules.
- **Tailwind with shadcn, on Base UI or Radix**: accessible primitives and a shared look, but a commitment made before knowing which components the layouts need.
