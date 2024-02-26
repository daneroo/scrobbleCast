import { daysAgo } from "./date";

const baseURL = "https://scrobblecast.dl.imetrical.com/api";

async function fetcher(path, qs = {}) {
  //  temporary for tracing, while we understand revalidation
  const ts = new Date().toISOString().replace(/:/g, ".");
  const qss = new URLSearchParams({ ...qs, ts }).toString();
  // const qss = new URLSearchParams(qs).toString()

  const url = `${baseURL}/${path}?${qss}`;
  // const now = +new Date()
  // eslint-disable-next-line no-undef
  const results = await fetch(url);
  const object = await results.json();
  // console.info('fetched', url, +new Date() - now)
  return object;
}

const cache = {
  episodes: {},
  episodesByUUID: {},
  podcasts: [],
  podcastsByUUID: {},
  booksFeed: null,
  bookById: {},
};

export async function getApiSignature() {
  const { version } = await import("../package.json");
  const generatedAt = new Date().toISOString();
  const apiSignature = {
    version,
    generatedAt,
  };
  // console.log('apiSignature', apiSignature)
  return apiSignature;
}

export async function getCounts() {
  const booksFeed = await getBooksFeed();
  const books = booksFeed.items.filter((b) => b.userShelves === "read").length;
  const podcasts = (await getPodcasts()).length; // filter for subscribed?
  const episodes = (await getDecoratedEpisodes()).filter(
    (episode) => episode.playedTime > 0
  ).length; // already filtered for < defaultDays
  return {
    books,
    podcasts,
    episodes,
  };
}

// - try the cache, then fetch else return {}
async function getByUUID({ uuid, type, cacheType }) {
  if (cache?.[cacheType]?.[uuid]) {
    return cache[cacheType][uuid];
  }
  const items = await fetcher("history", { uuid, type, origin: "getByUUID" });
  const item = items?.[0] ?? {};
  return item;
}

export async function getEpisode(uuid) {
  await getEpisodes(); // warm up the cache
  const episode = await getByUUID({
    uuid,
    type: "episode",
    cacheType: "episodesByUUID",
  });
  return playDecorate(episode);
}

export async function getPodcast(uuid) {
  await getPodcasts(); // warm up the cache
  return getByUUID({ uuid, type: "podcast", cacheType: "podcastsByUUID" });
}

const defaultDays = 7;
export async function getEpisodes(days = defaultDays) {
  if (cache.episodes.length > 0) {
    const { episodes } = cache;
    // console.log('|Episodes (hit)|', episodes.length)
    return episodes;
  }

  const since = daysAgo(days);
  const episodes = await fetcher("history", {
    type: "episode",
    user: "daniel",
    since,
    origin: "getEpisodes",
  });
  cache.episodes = episodes;
  for (const e of episodes) {
    cache.episodesByUUID[e.uuid] = e;
  }
  // console.log(`|Episodes (miss)| = ${episodes.length} == uuids: ${Object.keys(cache.episodesByUUID).length}`)
  return episodes;
}

export async function getPodcasts() {
  if (cache.podcasts.length > 0) {
    const { podcasts } = cache;
    // console.log('|Podcast (hit)|', podcasts.length)
    return podcasts;
  }

  const podcasts = await fetcher("history", {
    type: "podcast",
    user: "daniel",
    origin: "getPodcasts",
  });
  cache.podcasts = podcasts;
  for (const p of podcasts) {
    cache.podcastsByUUID[p.uuid] = p;
  }
  // console.log(`|Podcasts (miss)| = ${podcasts.length} == uuids: ${Object.keys(cache.podcastsByUUID).length}`)
  return podcasts;
}

// https://raw.githubusercontent.com/daneroo/scrobble-books-data/main/goodreads-rss.json
export async function getBooksFeed() {
  // TODO(daneroo) re-enable cache, disable for now, completely
  // if (cache.booksFeed) {
  //   const { booksFeed } = cache;
  //   // console.log('|Books (hit)|', booksFeed.items.length)
  //   return booksFeed;
  // }

  // Get books data from latest `scrobble-books-data` Github Actions run
  const url =
    "https://raw.githubusercontent.com/daneroo/scrobble-books-data/main/goodreads-rss.json";
  // eslint-disable-next-line no-undef
  const results = await fetch(url);
  const booksFeed = await results.json();

  // Move this upstream to scrobble-books-data
  booksFeed.items = booksFeed.items.map((b) => ({
    ...b,
    userShelves: b?.userShelves || "read",
  }));

  cache.booksFeed = booksFeed;
  for (const b of booksFeed.items) {
    cache.bookById[b.bookId] = b;
  }
  console.log(
    `|Books (miss)| = ${booksFeed.items.length} == uuids: ${
      Object.keys(cache.bookById).length
    }`
  );
  return booksFeed;
}

export async function getBook(bookId) {
  await getBooksFeed(); // // warm up the cache
  return cache.bookById[bookId];
}

// add podcast object to episodes
export async function getDecoratedEpisodes(days) {
  // first add podcast
  const podcastsByUUID = byUUID(await getPodcasts());
  const episodes = await getEpisodes(days);
  const decorated = episodes.map((episode) => {
    return {
      ...playDecorate(episode),
      podcast: podcastsByUUID[episode.podcast_uuid],
    };
  });
  return decorated;
}

// playCount playedTime firstPlayed lastPlayed playedProportion
export function playDecorate(episode) {
  const play = episode.history.played_up_to;
  const playedTime = Math.max(...Object.values(play)) || 0;
  const playedProportion = playedTime / episode.duration;

  return {
    ...episode,
    playedTime,
    playedProportion,
  };
}

function byUUID(ary) {
  return ary.reduce((acc, item) => {
    const { uuid } = item;
    return {
      ...acc,
      [uuid]: item,
    };
  }, {});
}
