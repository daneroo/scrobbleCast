import { fetchAPI } from "./src/api.ts";
import { addDaysUTC, startOfDayUTC, walkDaysUTC } from "./src/timewalker.ts";

// host [ "dirac", "darwin", "newton" ]
// problems:
// [2018-11-18T00:00:00Z,2018-11-19T00:00:00Z) :  !ok (1864,1865,1865))
// length [ 1864, 1865, 1865 ]
// {
//   digests: [
//     "SHA-256:da94080694292e762412a9ea5e32672d43f3300db59d343ed4857a6bf3f251d2",
//     "SHA-256:595182749867ee0a2894c0ba5898fab644033e0a7a5b848198ee06cfb309c866",
//     "SHA-256:595182749867ee0a2894c0ba5898fab644033e0a7a5b848198ee06cfb309c866"
//   ]
// }
// [2022-02-04T00:00:00Z,2022-02-05T00:00:00Z) :  !ok (88,88,87))
//   host [ "dirac", "darwin", "newton" ]
//   length [ 88, 88, 87 ]
//   {
//     digests: [
//       "SHA-256:45be0a7662601cb6a5501862294895e1f2b2a592c770ac344412b17d5e9cb8ba",
//       "SHA-256:45be0a7662601cb6a5501862294895e1f2b2a592c770ac344412b17d5e9cb8ba",
//       "SHA-256:7a584f8bc89507a4c87f4e8b6580c77bc8c0142401b7ba787a786c90eee80f63"
//     ]
//   }
// [2022-11-16T00:00:00Z,2022-11-17T00:00:00Z) :  !ok (114,114,116))
//   host [ "dirac", "darwin", "newton" ]
//   length [ 114, 114, 116 ]
//   {
//     digests: [
//       "SHA-256:8f5537071832a3a886fdc4c98fb7fd03e12a4f9dff8b26d410e75989067f6dc2",
//       "SHA-256:8f5537071832a3a886fdc4c98fb7fd03e12a4f9dff8b26d410e75989067f6dc2",
//       "SHA-256:6d512b8ad6ec695285b3c5cf6c261defd0a1e13cd35ec83e807c23c64854974e"
//     ]
//   }

const yesterday = startOfDayUTC(addDaysUTC(new Date().toISOString(), -1));
const tomorrow = startOfDayUTC(addDaysUTC(new Date().toISOString(), 1));
// const [since, before] = [epoch, tomorrow];
const [since, before] = [yesterday, tomorrow];
// const [since, before] = ["2018-11-18", "2018-11-19T00:00:01Z"];
// const [since, before] = ["2022-02-04", "2022-02-05T00:00:01Z"];
// const [since, before] = ["2022-11-16", "2022-11-17T00:00:01Z"];
// const since = "2022-11-16";

console.log(`-= Interval: [${since},${before})`);

// const baseURI = "http://dirac:8000/api";
const hosts = ["darwin", "d1-px1", "dirac"];
const users = ["daniel", "stephane"].slice(0, 1);
const types = ["podcast", "episode"];
for (const user of users) {
  for (const type of types) {
    console.log(`-= ${user}'s ${type}s`);
    for (const intvl of walkDaysUTC(since, before)) {
      const qs = { user, type, ...intvl };

      const itemsByHost = await fetchItemsForHosts(hosts, qs);

      await compare(qs, itemsByHost);
    }
  }
}

interface ItemQuery {
  user: string;
  type: string;
  since: string;
  before: string;
}

async function compare(
  qs: ItemQuery,
  itemsByHost: Record<string, unknown[]>,
): Promise<void> {
  const lengths = Object.values(itemsByHost).map((items) => items.length);

  const digests = await Promise.all(
    Object.values(itemsByHost).map((items) => digest(JSON.stringify(items))),
  );
  const ok = allEqual(digests);
  if (ok) {
    console.log(`[${qs.since},${qs.before}) :  ok (${lengths.join(",")}))`);
  } else {
    console.log(`[${qs.since},${qs.before}) :  !ok (${lengths.join(",")}))`);
    console.log("host", Object.keys(itemsByHost));
    console.log(
      "length",
      Object.values(itemsByHost).map((items) => items.length),
    );
    console.log({ digests });
  }
}

// const allEqual = arr => arr.every(val => val === arr[0]);
function allEqual<T>(arr: T[]): boolean {
  return arr.every((val) => val === arr[0]);
}

// Returns a map of items by Host
async function fetchItemsForHosts(
  hosts: string[],
  qs: ItemQuery,
): Promise<Record<string, unknown[]>> {
  // fetch items from hosts in parallel
  const itemsByIndex = await Promise.all(
    hosts.map((host) => fetchItems(host, qs)),
  );
  const itemsByHost: Record<string, unknown[]> = {};
  hosts.forEach((host, index) => {
    itemsByHost[host] = itemsByIndex[index];
  });
  return itemsByHost;
}

async function fetchItems(host: string, qs: ItemQuery): Promise<unknown[]> {
  const json = await fetchAPI(`http://${host}:8000/api/items`, qs);
  return JSON.parse(json);
}

async function digest(
  str: string,
  algorithm = "SHA-256",
  prependAlgorithm = true,
) {
  const input = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest(algorithm, input); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return prependAlgorithm ? `${algorithm}:${hashHex}` : hashHex;
}
