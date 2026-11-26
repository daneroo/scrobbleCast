import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { getBook, getBooks } from './data/books'
import { subscribeShownCopies, type FeedName } from './data/fetch'
import { getEpisode, getEpisodeFeed, getEpisodes, getPodcast, getPodcasts } from './data/podcasts'
import { documentTitle } from './format'
import { Layout, LoadError, NotFound } from './layout'
import { Books } from './books/page'
import { BookDetail, EpisodeDetail, Episodes, Home, PodcastDetail, Podcasts } from './pages'

const root = createRootRoute({
  head: () => ({ meta: [{ title: 'Scrobble Cast' }] }),
  component: Layout,
  notFoundComponent: NotFound,
})

const home = createRoute({
  getParentRoute: () => root,
  path: '/',
  staticData: { feeds: ['books', 'podcasts', 'episodes'] },
  // Each card's count needs only its own feed.
  loader: () => handOff({ books: getBooks(), podcasts: getPodcasts(), episodes: getEpisodeFeed() }),
  component: () => <Home feeds={home.useLoaderData()} />,
})

const books = createRoute({
  getParentRoute: () => root,
  path: '/books',
  staticData: { feeds: ['books'] },
  head: () => pageTitle('Books'),
  loader: () => handOff({ books: getBooks() }),
  component: () => <Books books={books.useLoaderData().books} />,
})

const book = createRoute({
  getParentRoute: () => root,
  path: '/books/$bookId',
  staticData: { feeds: ['books'] },
  head: () => pageTitle('Book'),
  loader: ({ params }) => handOff({ book: getBook(params.bookId) }),
  component: () => <BookDetail book={book.useLoaderData().book} />,
  notFoundComponent: NotFound,
})

const podcasts = createRoute({
  getParentRoute: () => root,
  path: '/podcasts',
  staticData: { feeds: ['podcasts'] },
  head: () => pageTitle('Podcasts'),
  loader: () => handOff({ podcasts: getPodcasts() }),
  component: () => <Podcasts podcasts={podcasts.useLoaderData().podcasts} />,
})

const podcast = createRoute({
  getParentRoute: () => root,
  path: '/podcasts/$uuid',
  head: () => pageTitle('Podcast'),
  loader: ({ params }) => handOff({ podcast: getPodcast(params.uuid) }),
  shouldReload: onlyOnEnter,
  component: () => <PodcastDetail podcast={podcast.useLoaderData().podcast} />,
  notFoundComponent: NotFound,
})

const episodes = createRoute({
  getParentRoute: () => root,
  path: '/episodes',
  // Episode titles come from the podcast feed.
  staticData: { feeds: ['episodes', 'podcasts'] },
  head: () => pageTitle('Recent episodes'),
  loader: () => handOff({ episodes: getEpisodes() }),
  component: () => <Episodes episodes={episodes.useLoaderData().episodes} />,
})

const episode = createRoute({
  getParentRoute: () => root,
  path: '/episodes/$uuid',
  head: () => pageTitle('Episode'),
  loader: ({ params }) => handOff({ episode: getEpisode(params.uuid) }),
  shouldReload: onlyOnEnter,
  component: () => <EpisodeDetail episode={episode.useLoaderData().episode} />,
  notFoundComponent: NotFound,
})

// A lookup by `uuid` runs when the page opens, and again only after "Try
// again": `invalidate()` otherwise reloads every page on screen, and a lookup
// isn't shared, so it would fetch again and show its placeholder.
function onlyOnEnter({ cause }: { cause: 'preload' | 'enter' | 'stay' }) {
  return cause !== 'stay'
}

// Loaders hand their promises to `<Await>` without awaiting them. `<Await>`
// handles a rejection only once it renders, so a fast failure would be
// reported as unhandled first: mark them handled now. `<Await>` still gets the
// same promises and shows the error.
function handOff<T extends Record<string, Promise<unknown>>>(promises: T): T {
  for (const promise of Object.values(promises)) promise.catch(() => {})
  return promises
}

function pageTitle(title: string) {
  return { meta: [{ title: documentTitle(title) }] }
}

export const router = createRouter({
  routeTree: root.addChildren([home, books, book, podcasts, podcast, episodes, episode]),
  scrollRestoration: true,
  defaultErrorComponent: LoadError,
})

// When a fresh copy replaces a saved copy, the pages showing that feed load
// again: their loaders get the new copy ready at once, and their state
// (search or query text, "Show more") stays.
subscribeShownCopies((name, replaced) => {
  if (replaced) void router.invalidate({ filter: (match) => match.staticData.feeds?.includes(name) ?? false })
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  // The feeds a page shows, listed in the footer. Detail pages that look one
  // record up by `uuid` use no feed.
  interface StaticDataRouteOption {
    feeds?: FeedName[]
  }
}
