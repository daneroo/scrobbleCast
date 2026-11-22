# Scrobble Cast

This browser app loads Goodreads data from S3 and listening history from the ScrobbleCast API. Fuse indexes and searches the data in the browser.

```sh
cd site
npm ci
npm run dev
```

Open http://127.0.0.1:3015. Use `npm run typecheck` and `npm run build` to check the app, or `npm run preview` to serve the production build locally.

## Deploy

Run both commands from `site/`.

- Preview with `vercel deploy`.
- Deploy to production with `vercel deploy --prod`.
