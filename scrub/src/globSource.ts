import { expandGlob } from "./deps.ts";

// https://javascript.info/async-iterators-generators

type Thing = {
  name: string;
  path: string;
};

export async function* fromGlob(glob: string): AsyncIterableIterator<Thing> {
  for await (const file of expandGlob(glob, { includeDirs: false })) {
    // const { name, path } = file;
    yield file;
  }
}
