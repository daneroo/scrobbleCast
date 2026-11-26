import { Await, Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { Feed } from '../data/fetch'
import type { Podcast } from '../data/podcasts'
import { day } from '../format'
import { Collection, Controls, SearchBox, SelfSortingTable } from '../list/legacy'
import { search } from '../list/search'
import type { Column } from '../list/table'
import { Loading } from '../ui'

// The podcasts list, as it was before the query model (#94 and #95 move it
// onto the shared list page).

const podcastKeys = ['title', 'author', 'description']

const podcastColumns: Column<Podcast>[] = [
  {
    key: 'title',
    label: 'Title',
    value: (podcast) => podcast.title,
    cell: (podcast) => <Link to="/podcasts/$uuid" params={{ uuid: podcast.uuid }}>{podcast.title}</Link>,
  },
  { key: 'author', label: 'Author', value: (podcast) => podcast.author },
  { key: 'since', label: 'Since', value: (podcast) => podcast.firstSeen, cell: (podcast) => day(podcast.firstSeen) },
]

export function Podcasts({ podcasts }: { podcasts: Promise<Feed<Podcast[]>> }) {
  const [query, setQuery] = useState('')
  const results = (podcasts: Podcast[]) => search(podcasts, podcastKeys, query)
  return (
    <Collection title="Podcasts" feed={podcasts} results={results}>
      <Controls>
        <SearchBox value={query} onChange={setQuery} label="Search podcasts" />
      </Controls>
      <Await promise={podcasts} fallback={<Loading block />}>
        {({ data }) => <SelfSortingTable items={results(data)} columns={podcastColumns} id={(podcast) => podcast.uuid} />}
      </Await>
    </Collection>
  )
}
