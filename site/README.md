# Scrobble Cast

This browser app loads Goodreads data from S3 and listening history from the ScrobbleCast API. Fuse indexes and searches the data in the browser.

```sh
cd site
npm ci
npm run dev
```

Open <http://127.0.0.1:3015>. Use `npm run typecheck` and `npm run build` to check the app, or `npm run preview` to serve the production build locally.

## Deploy

Production: <https://scrobblecast.v.imetrical.com/>

Run both commands from `site/`.

- Preview with `vercel deploy`.
- Deploy to production with `vercel deploy --prod`.

`vercel.json` unsets `npm_config_cache_dir` to work around a [Vercel build bug](https://community.vercel.com/t/npm-warn-unknown-env-config-cache-dir-caused-by-vercel-build-environment/51678) that makes npm warn `Unknown env config "cache-dir"`. Remove it once Vercel fixes the bug.
