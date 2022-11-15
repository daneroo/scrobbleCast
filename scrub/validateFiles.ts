import { getEpisodes, getPodcasts } from "./src/jsonl.ts";
import { fromGlob } from "./src/globSource.ts";
import {
  validateJSONSchema,
  validatorForEpisode,
  validatorForPodcast,
} from "./src/validateJSONSchema.ts";

// steal cue's directory for now, which is copied from ../js/data/snapshots
const dataGLob = "./cue/data/snapshots/**/*.jsonl";

const now = +new Date();
const counts = {
  files: 0,
  items: 0,
  podcasts: {
    items: 0,
    uuids: 0,
  },
  episodes: {
    items: 0,
    uuids: 0,
  },
};
const uuidSets = {
  podcasts: new Set<string>(),
  episodes: new Set<string>(),
};

for await (const thing of fromGlob(dataGLob)) {
  counts.files++;
  const { name, path } = thing;
  {
    // podcast
    const reader = await Deno.open(path);
    const validate = validatorForPodcast();
    for await (const podcast of getPodcasts(reader)) {
      counts.podcasts.items++;
      uuidSets.podcasts.add(podcast.uuid);
      validateJSONSchema(validate, podcast);
    }
  }
  {
    // episode
    const reader = await Deno.open(path);
    const validate = validatorForEpisode();
    for await (const episode of getEpisodes(reader)) {
      counts.episodes.items++;
      uuidSets.episodes.add(episode.uuid);
      // counts.uuids = uuidSet.size
      // console.log(podcast.uuid);
      validateJSONSchema(validate, episode);
    }
  }
  console.log(`  .. ${name}`);
}
counts.items = counts.podcasts.items + counts.episodes.items;
counts.podcasts.uuids = uuidSets.podcasts.size;
counts.episodes.uuids = uuidSets.episodes.size;

const elapsed = (+new Date() - now) / 1000;
const rate = (counts.items / elapsed).toFixed(0);
console.log(
  `Found ${counts.files} files with ${counts.items} items @ ${rate}/s (${elapsed}s)`,
);
console.log("Found", JSON.stringify(counts, null, 2));
