import { Link } from '@tanstack/react-router'
import { recentDays } from '../config'
import type { Episode } from '../data/podcasts'
import type { PageDefinition } from '../list/page'
import type { ShownField } from '../list/shown'
import { Artwork } from '../ui'
import { episodesList } from './list'

// The episodes list's page: its registry on the shared list page, a table
// only for now (no presets, card or expanded row yet).
export const episodesPage: PageDefinition<Episode, ShownField<Episode>> = {
  name: 'episodes',
  title: 'Episodes',
  noun: ['episode', 'episodes'],
  placeholder: 'status:finished duration:>=1h sort:-played   — or just words',
  list: episodesList,
  presets: [],
  id: (episode) => episode.uuid,
  // Its podcast's artwork, its title and its podcast.
  lead: {
    label: 'Episode',
    cell: (episode) => (
      <span className="flex items-start gap-3">
        <Artwork src={episode.artwork} className="w-10" />
        <span className="grid">
          <Link to="/episodes/$uuid" params={{ uuid: episode.uuid }} className="font-semibold">{episode.title}</Link>
          <span className="text-sm text-muted-foreground">{episode.podcastTitle || '—'}</span>
        </span>
      </span>
    ),
  },
}

// Under the heading: how far back the episode feed reaches, the Window
// (which #94 makes widen).
export function EpisodesWindow() {
  return <p className="mt-1 text-muted-foreground">Changed in the last {recentDays} days</p>
}
