import { readLines } from "https://deno.land/std@0.109.0/io/mod.ts";

// https://javascript.info/async-iterators-generators

export async function* getPodcasts(
  reader: Deno.Reader,
): AsyncIterableIterator<any> {
  for await (const line of readLines(reader)) {
    const item = JSON.parse(line);
    if (item.type === "podcast") {
      yield item;
    }
  }
}

export async function* parseJSONLines(
  reader: Deno.Reader,
): AsyncIterableIterator<any> {
  for await (const line of readLines(reader)) {
    const item = JSON.parse(line);
    yield item;
  }
}
