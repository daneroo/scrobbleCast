import { fetchAPI } from "./src/api.ts";
import { epoch, walkMonthsUTC } from "./src/timewalker.ts";
import {
  validateJSONSchema,
  validatorForEpisode,
  validatorForPodcast,
} from "./src/validateJSONSchema.ts";

const baseURI = "http://dirac:8000/api";
const now = +new Date();
const counts = {
  chunks: 0,
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

for (const user of ["daniel", "stephane"]) {
  for (const type of ["podcast", "episode"]) {
    const validate = type === "podcast"
      ? validatorForPodcast()
      : validatorForEpisode();
    for (const intvl of walkMonthsUTC(epoch, new Date().toISOString())) {
      counts.chunks++;
      const qs = { user, type, ...intvl };
      const got = await fetchAPI(`${baseURI}/items`, qs);
      const items = JSON.parse(got);
      console.log(
        `${user}'s ${qs.type}s for [${qs.since},${qs.before}): ${items.length}`,
      );
      for (const item of items) {
        if (type === "podcast") {
          counts.podcasts.items++;
          uuidSets.podcasts.add(item.uuid);
        } else {
          counts.episodes.items++;
          uuidSets.episodes.add(item.uuid);
        }
        validateJSONSchema(validate, item);
      }
    }
  }
}

counts.items = counts.podcasts.items + counts.episodes.items;
counts.podcasts.uuids = uuidSets.podcasts.size;
counts.episodes.uuids = uuidSets.episodes.size;

const elapsed = (+new Date() - now) / 1000;
const rate = (counts.items / elapsed).toFixed(0);
console.log(
  `Found ${counts.chunks} chunks with ${counts.items} items @ ${rate}/s (${elapsed}s)`,
);
console.log("Found", JSON.stringify(counts, null, 2));
