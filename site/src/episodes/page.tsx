import { Await, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { episodePageSize, episodePageStep, recentDays } from '../config'
import type { Feed } from '../data/fetch'
import type { Episode } from '../data/podcasts'
import { day, playedPercent } from '../format'
import { Collection, Controls, SearchBox, SelfSortingTable } from '../list/legacy'
import { search } from '../list/search'
import type { Column } from '../list/table'
import { Button, Loading } from '../ui'

// The episodes list, as it was before the query model (#93 moves it onto the
// shared list page).

const episodeKeys = ['title', 'podcastTitle']

const episodeColumns: Column<Episode>[] = [
  {
    key: 'title',
    label: 'Title',
    value: (episode) => episode.title,
    cell: (episode) => <Link to="/episodes/$uuid" params={{ uuid: episode.uuid }}>{episode.title}</Link>,
  },
  {
    key: 'podcast',
    label: 'Podcast',
    value: (episode) => episode.podcastTitle,
    cell: (episode) => episode.podcastId && episode.podcastTitle
      ? <Link to="/podcasts/$uuid" params={{ uuid: episode.podcastId }}>{episode.podcastTitle}</Link>
      : episode.podcastTitle || '—',
  },
  { key: 'played', label: 'Played', value: playedPercent, cell: (episode) => playedPercent(episode) + '%' },
  { key: 'lastPlayed', label: 'Last played', value: (episode) => episode.lastPlayed, cell: (episode) => day(episode.lastPlayed) },
]

export function Episodes({ episodes }: { episodes: Promise<Feed<Episode[]>> }) {
  const [query, setQuery] = useState('')
  const [playedOnly, setPlayedOnly] = useState(true)
  const [limit, setLimit] = useState(episodePageSize)
  const results = (episodes: Episode[]) => search(episodes, episodeKeys, query)
    .filter((episode) => !playedOnly || episode.playedSeconds > 0)
  return (
    <Collection title="Recent episodes" feed={episodes} results={results}>
      <p className="-mt-3 mb-4 text-muted-foreground">Last {recentDays} days</p>
      <Controls>
        <SearchBox value={query} onChange={(value) => { setQuery(value); setLimit(episodePageSize) }} label="Search episodes" />
        <label className="flex min-h-11 items-center gap-1.5 text-sm font-semibold">
          <input type="checkbox" className="size-4.5 accent-primary" checked={playedOnly} onChange={(event) => { setPlayedOnly(event.target.checked); setLimit(episodePageSize) }} />
          Played only
        </label>
      </Controls>
      <Await promise={episodes} fallback={<Loading block />}>
        {({ data }) => {
          const found = results(data)
          const shown = Math.min(found.length, limit)
          return (
            <>
              <SelfSortingTable items={found} columns={episodeColumns} id={(episode) => episode.uuid} limit={limit} />
              {shown < found.length && (
                <div className="mt-4 flex items-center gap-4">
                  <Button onClick={() => setLimit(limit + episodePageStep)}>Show more</Button>
                  <span className="text-muted-foreground">{shown} of {found.length}</span>
                </div>
              )}
            </>
          )
        }}
      </Await>
    </Collection>
  )
}
