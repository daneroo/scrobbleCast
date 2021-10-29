import { readLines } from "./deps.ts";

// https://javascript.info/async-iterators-generators

export async function* getPodcasts(
  reader: Deno.Reader,
): AsyncIterableIterator<any> {
  for await (const line of readLines(reader)) {
    const item = JSON.parse(line);
    const { __type } = item;
    // console.log({type});
    if (__type === "podcast") {
      yield item;
    }
  }
}
export async function* getEpisodes(
  reader: Deno.Reader,
): AsyncIterableIterator<any> {
  for await (const line of readLines(reader)) {
    const item = JSON.parse(line);
    const { __type } = item;
    // console.log({type});
    if (__type === "episode") {
      yield item;
    }
  }
}

// generic filter
// export const filter = <T, U extends T>(filter: (input: T) => input is U) =>
//   async function* filterGenerator(asyncIterable: AsyncIterableIterator<T>) {
//     for await (const value of asyncIterable) {
//       if (filter(value)) {
//         yield value;
//       }
//     }
//   };

export async function* parseJSONLines(
  reader: Deno.Reader,
): AsyncIterableIterator<any> {
  for await (const line of readLines(reader)) {
    const item = JSON.parse(line);
    yield item;
  }
}
