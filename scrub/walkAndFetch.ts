import { fetchAPI } from "./src/api.ts";
import { epoch, walkMonthsUTC } from "./src/timewalker.ts";

const baseURI = "http://dirac:8000/api";
// const qyBase = {
//   user: "daniel",
//   type: "podcast",
//   // type: "episode",
//   // since: "2015-01-01",
//   // before: "2016-01-01",
// };

for (const user of ["daniel", "stephane"]) {
  for (const type of ["podcast", "episode"]) {
    for (const intvl of walkMonthsUTC(epoch, new Date().toISOString())) {
      const qs = { user, type, ...intvl };
      const got = await fetchAPI(`${baseURI}/items`, qs);
      const digests = JSON.parse(got);
      console.log(
        `${user}'s ${qs.type}s for [${qs.since},${qs.before}): ${digests.length}`,
      );
    }
  }
}
