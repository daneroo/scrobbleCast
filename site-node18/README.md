# Scrobble Cast

This browser app loads Goodreads data from S3 and listening history from the ScrobbleCast API. Fuse indexes and searches the data in the browser.

```sh
cd site
npm ci
npm run dev
```

Open http://127.0.0.1:3015. Use `npm run typecheck` and `npm run build` to check the app, or `npm run preview` to serve the production build locally.

- In Vercel, set Framework Preset to Vite and Node.js to 26.x, leave Root Directory blank, and scope `NODE_OPTIONS` to Production and Development for the preview.
- From `site/`, run `vercel deploy` for preview. Once it passes, delete `NODE_OPTIONS`, stage with `vercel deploy --prod --skip-domain`, and promote with `vercel promote <url>`.
