import { fetchAPI } from "./src/api.ts";
import { epoch, walkDaysUTC } from "./src/timewalker.ts";

// const baseURI = "http://dirac:8000/api";
const hosts = ["dirac", "darwin"];

for (const user of ["daniel", "stephane"]) {
  for (const type of ["podcast", "episode"]) {
    for (const intvl of walkDaysUTC(epoch, new Date().toISOString())) {
      const qs = { user, type, ...intvl };
      // const [a, b] = await Promise.all(hosts.map((host) => fetchAPI(host, qs)));
      const [a, b] = (await Promise.all(
        hosts.map((host) => fetchAPI(`http://${host}:8000/api/items`, qs)),
      )).map((json) => JSON.parse(json));

      // const got = await fetchAPI(`${baseURI}/items`, qs);
      // const items = JSON.parse(got);
      console.log(
        `${user}'s ${qs.type}s for [${qs.since},${qs.before}): a:${a.length} b:${b.length}`,
      );
    }
  }
}
