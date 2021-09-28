# Next.js + Chakra-ui

Following instructions with [this tutorial](https://www.freecodecamp.org/news/how-to-use-chakra-ui-with-next-js-and-react/), but updating for latest Chakra-ui instructions.

```bash
npx create-next-app my-chakra-app
# Chakra site:
npm i @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

## TODO

- React Table for listings
  - pagination, filtering
- Extract hook for Stork - remove global (loadedIndexes state)
- Cache for api calls - refactor
- ISR pass thru for indexed bot not generated...
- Lighthouse - round 1 done - 68 mobile/99 desktop
  - <https://web.dev/render-blocking-resources/?utm_source=lighthouse&utm_medium=devtools>
  - <https://javascript.info/script-async-defer>
  - <https://web.dev/defer-non-critical-css/>
- move to nx/TypeScript - add tests
- redo layout - header/footer - see <https://play.pocketcasts.com/>
  - <https://raptis.wtf/blog/build-a-landing-page-with-chakra-ui-part-1/>
- CMS: fetch notes (in `../js/showNotes`)
  - scrape - subscribed podcasts/known podcasts/known episodes
    - check by fetching it's show notes even if episode is not in list
  - Here's one I'm no longer subscribed to: <https://play.pocketcasts.com/discover/podcast/e704d9e0-9b5b-0133-2dcb-6dc413d6d41d>
  - just return uuid for `getStaticPaths`
  - [If-None-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match)
  - [If-Modified-Since](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since)
- cache/expire episodes/podcast in `data/<type>.json` so other thread see them.
- some pages not generated... on demand fallback...
- add episodes to podcast page
- add links (Header)
- joining to podcast from episode
- vega-lite (d3) for viz
- vercel  for deployment
- netlify for deployment

## Publish to Vercel

We publish with a local build for now.

- Update stork index as below
- `npm run build`
- `npm run start` # test locally
- `vercel` || `vercel --prod`

### Stork

- Full index: ~73k entries - 48 minutes - 26MB
- 90d: ~2.4k entries - 20s - 3MB
- 180d: ~7k entries - 69s - 5MB

For the stork index, we run a build with `STORK_WRITE_INDEX=true` which:

- overwrites files in `./data`
- uses docker to produce `public/stork/scrobblecast.st`

```bash
# rm -rf data
STORK_WRITE_INDEX_FILES=true npm run build
docker build -t stork stork/  # once only
# build the index from the generated files
docker run --rm -it --name stork -v $(pwd)/data:/data stork
# copy the `.st` file to the public forlder
scp -p data/scrobblecast.st public/stork/scrobblecast.st
```

## Show Notes

Augmented the scrape api to get show notes, should produces a single (html file) with episode info and show notes

FUll episodes, no showNotes:

```bash
$ time docker run --rm -it -v $(pwd)/data:/data stork; scp -p data/scrobblecast.st public/stork/scrobblecast.st
Index built, 25,957,020 bytes written to scrobblecast.st.
354 bytes/entry (average entry size is 46 bytes)
  2890.039s to build index
  0.761s to write file
  2890.800s total
2890.110s
$ du -sm data/scrobblecast.st 
26  data/scrobblecast.st
$ wc -l data/config.toml 
   73161 data/config.toml
```
