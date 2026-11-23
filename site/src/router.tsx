import { createRootRoute, createRoute, createRouter, notFound } from '@tanstack/react-router'
import { getBooks } from './data/books'
import { getEpisode, getEpisodes, getPodcast, getPodcasts } from './data/podcasts'
import { Layout, LoadError, NotFound } from './layout'
import { BookDetail, Books, EpisodeDetail, Episodes, Home, PodcastDetail, Podcasts } from './pages'

const root = createRootRoute({
  head: () => ({ meta: [{ title: 'Scrobble Cast' }] }),
  component: Layout,
  notFoundComponent: NotFound,
})

const home = createRoute({
  getParentRoute: () => root,
  path: '/',
  loader: async () => {
    const [books, podcasts, episodes] = await Promise.all([getBooks(), getPodcasts(), getEpisodes()])
    return {
      books: books.filter((book) => book.userShelf === 'read').length,
      podcasts: podcasts.length,
      episodes: episodes.filter((episode) => episode.playedSeconds > 0).length,
    }
  },
  component: () => <Home counts={home.useLoaderData()} />,
})

const books = createRoute({
  getParentRoute: () => root,
  path: '/books',
  head: () => pageTitle('Books'),
  loader: () => getBooks(),
  component: () => <Books books={books.useLoaderData()} />,
})

const book = createRoute({
  getParentRoute: () => root,
  path: '/books/$bookId',
  loader: async ({ params }) => {
    const found = (await getBooks()).find((book) => book.bookId === params.bookId)
    if (!found) throw notFound()
    return found
  },
  head: ({ loaderData }) => pageTitle(loaderData?.title ?? 'Book'),
  component: () => <BookDetail book={book.useLoaderData()} />,
})

const podcasts = createRoute({
  getParentRoute: () => root,
  path: '/podcasts',
  head: () => pageTitle('Podcasts'),
  loader: () => getPodcasts(),
  component: () => <Podcasts podcasts={podcasts.useLoaderData()} />,
})

const podcast = createRoute({
  getParentRoute: () => root,
  path: '/podcasts/$uuid',
  loader: async ({ params }) => {
    const found = await getPodcast(params.uuid)
    if (!found) throw notFound()
    return found
  },
  head: ({ loaderData }) => pageTitle(loaderData?.title ?? 'Podcast'),
  component: () => <PodcastDetail podcast={podcast.useLoaderData()} />,
})

const episodes = createRoute({
  getParentRoute: () => root,
  path: '/episodes',
  head: () => pageTitle('Recent episodes'),
  loader: () => getEpisodes(),
  component: () => <Episodes episodes={episodes.useLoaderData()} />,
})

const episode = createRoute({
  getParentRoute: () => root,
  path: '/episodes/$uuid',
  loader: async ({ params }) => {
    const found = await getEpisode(params.uuid)
    if (!found) throw notFound()
    return found
  },
  head: ({ loaderData }) => pageTitle(loaderData?.title ?? 'Episode'),
  component: () => <EpisodeDetail episode={episode.useLoaderData()} />,
})

function pageTitle(title: string) {
  return { meta: [{ title: `${title} · Scrobble Cast` }] }
}

export const router = createRouter({
  routeTree: root.addChildren([home, books, book, podcasts, podcast, episodes, episode]),
  scrollRestoration: true,
  defaultPendingMs: 150,
  defaultPendingComponent: () => <p className="empty" role="status">Loading…</p>,
  defaultErrorComponent: LoadError,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
