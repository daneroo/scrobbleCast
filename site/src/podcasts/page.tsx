import { Link } from '@tanstack/react-router'
import type { Podcast } from '../data/podcasts'
import type { PageDefinition } from '../list/page'
import type { ShownField } from '../list/shown'
import { Artwork } from '../ui'
import { podcastsList } from './list'

export const podcastsPage: PageDefinition<Podcast, ShownField<Podcast>> = {
  name: 'podcasts',
  title: 'Podcasts',
  noun: ['podcast', 'podcasts'],
  placeholder: 'plays:>0 sort:-listened   — or just words',
  list: podcastsList,
  presets: [],
  id: (podcast) => podcast.uuid,
  lead: {
    label: 'Podcast',
    cell: (podcast) => (
      <span className="flex items-start gap-3">
        <Artwork src={podcast.thumbnail} className="w-10" />
        <span className="grid">
          <Link to="/podcasts/$uuid" params={{ uuid: podcast.uuid }} className="font-semibold">{podcast.title}</Link>
          <span className="text-sm text-muted-foreground">{podcast.author || '—'}</span>
        </span>
      </span>
    ),
  },
}
