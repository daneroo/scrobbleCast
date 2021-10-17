import { parseJSONLines } from "./jsonl.ts";

type ItemTypeCounts = {
  episodes: number;
  podcasts: number;
  items: number;
};
export async function classify(
  path: string,
): Promise<ItemTypeCounts> {
  const types: ItemTypeCounts = {
    episodes: 0,
    podcasts: 0,
    items: 0,
  };
  const reader = await Deno.open(path);
  for await (const item of parseJSONLines(reader)) {
    const { __type: type } = item;
    types.items++;
    if (type === "episode") {
      types.episodes++;
    } else if (type === "podcast") {
      types.podcasts++;
    }
  }
  return types;
}
