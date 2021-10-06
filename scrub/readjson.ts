import { expandGlob } from "https://deno.land/std@0.109.0/fs/mod.ts";
import { parseJSONLines } from "./src/jsonl.ts";

// steal cue's directory for now, which is copied from ../js/data/snapshots
const dataGLob = "./cue/data/snapshots/**/*.jsonl";

const now = +new Date();
const counts = {
  files: 0,
  items: 0,
  episodes: 0,
  podcasts: 0,
};
for await (const file of expandGlob(dataGLob, { includeDirs: false })) {
  counts.files++;
  const { name, path } = file;
  const types = await classify(path);
  counts.items += types.total;
  counts.episodes += types.episodes;
  counts.podcasts += types.podcasts;

  console.log(`|${name}|= ${types.total}`);
}
const elapsed = (+new Date() - now) * 1000;
const rate = (counts.items / elapsed).toFixed(0);
console.log(
  `Found ${counts.files} files with ${counts.items} items @ ${rate}/s (${elapsed}s)`,
);
console.log("Found", JSON.stringify(counts, null, 2));

async function classify(
  path: string,
): Promise<{ episodes: number; podcasts: number; total: number }> {
  const types = {
    episodes: 0,
    podcasts: 0,
    total: 0,
  };
  const reader = await Deno.open(path);
  for await (const item of parseJSONLines(reader)) {
    const { __type: type } = item;
    types.total++;
    if (type === "episode") {
      types.episodes++;
    } else if (type === "podcast") {
      types.podcasts++;
    }
  }
  return types;
}
