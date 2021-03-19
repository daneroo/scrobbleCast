# Next.js + Chakra-ui

Following instructions with [this tutorial](https://www.freecodecamp.org/news/how-to-use-chakra-ui-with-next-js-and-react/), but updating for latest Chakra-ui instructions.

```bash
npx create-next-app my-chakra-app
# Chakra site:
npm i @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

## TODO

- fetch notes (in `../js`)
- cache/expire episodes/podcast in `data/<type>.json` so other thread see them.
- just return uuid for `getStaticPaths`
- some pages not generated... on demand fallback...
- fetch notes (in `../js`)
- add episodes to podcast page
- redo layout - header/footer
- add links (Header)
- joining to podcast from episode
- [Stork](https://github.com/jameslittle230/stork) for search
  - [James Little component](https://github.com/stork-search/site/blob/master/src/components/stork.js)
- vega-lite (d3) for viz
- vercel  for deployment
- netlify for deployment

## Stork

- Full index: ~73k entries - 48 minutes - 26MB
- 90d: ~2.4k entries - 20s - 3MB
- 180d: ~7k entries - 69s - 5MB

```bash
docker build -t stork stork/  # once only
docker run --rm -it -v $(pwd)/data:/data stork
scp -p data/scrobblecast.st public/stork/scrobblecast.st
```


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
