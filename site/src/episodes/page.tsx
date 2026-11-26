import { Link } from '@tanstack/react-router'
import type { Episode } from '../data/podcasts'
import type { PageDefinition } from '../list/page'
import type { ShownField } from '../list/shown'
import { LeadCell } from '../list/table'
import { Artwork } from '../ui'
import { EpisodeCard } from './card'
import { episodesList } from './list'
import { EpisodePanel } from './panel'
import { episodePresets } from './presets'

// The episodes list's registry and views on the shared list page.
export const episodesPage: PageDefinition<Episode, ShownField<Episode>> = {
  name: 'episodes',
  title: 'Episodes',
  noun: ['episode', 'episodes'],
  placeholder: 'status:finished duration:>=1h sort:-played   — or just words',
  list: episodesList,
  presets: episodePresets,
  id: (episode) => episode.uuid,
  // Its podcast's artwork, its title and its podcast.
  lead: {
    label: 'Episode',
    cell: (episode) => (
      <LeadCell
        artwork={<Artwork src={episode.artwork} className="w-10" />}
        title={<Link to="/episodes/$uuid" params={{ uuid: episode.uuid }} className="font-semibold">{episode.title}</Link>}
        byline={episode.podcastTitle || '—'}
      />
    ),
  },
  expand: {
    panel: (episode) => <EpisodePanel episode={episode} />,
    label: (episode) => `Details for ${episode.title}`,
  },
  card: (episode, fields, size) => <EpisodeCard episode={episode} size={size === 'lane' ? 'small' : size} fields={fields} />,
}
