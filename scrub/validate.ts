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
  uuids: 0,
  podcasts: 0,
  episodes: 0,
};
const uuidSet = new Set<string>();

for await (const thing of fromGlob(dataGLob)) {
  counts.files++;
  const { name, path } = thing;
  {
    // podcast
    const reader = await Deno.open(path);
    const validate = validatorForPodcast();
    for await (const podcast of getPodcasts(reader)) {
      counts.podcasts++;
      uuidSet.add(podcast.uuid);
      validateJSONSchema(validate, podcast);
    }
  }
  {
    // episode
    const reader = await Deno.open(path);
    const validate = validatorForEpisode();
    for await (const episode of getEpisodes(reader)) {
      counts.episodes++;
      uuidSet.add(episode.uuid);
      // counts.uuids = uuidSet.size
      // console.log(podcast.uuid);
      validateJSONSchema(validate, episode);
    }
  }
  console.log(`  .. ${name}`);
}
counts.uuids = uuidSet.size; // only count once!

const elapsed = (+new Date() - now) / 1000;
const rate = (counts.podcasts / elapsed).toFixed(0);
console.log(
  `Found ${counts.files} files with ${counts.podcasts} items @ ${rate}/s (${elapsed}s)`,
);
console.log("Found", JSON.stringify(counts, null, 2));
