import { Link } from '@tanstack/react-router'
import type { Podcast } from '../data/podcasts'
import type { PageDefinition } from '../list/page'
import type { ShownField } from '../list/shown'
import { LeadCell } from '../list/table'
import { Artwork } from '../ui'
import { PodcastCard } from './card'
import { podcastsList } from './list'
import { PodcastPanel } from './panel'
import { podcastPresets } from './presets'

export const podcastsPage: PageDefinition<Podcast, ShownField<Podcast>> = {
  name: 'podcasts',
  title: 'Podcasts',
  noun: ['podcast', 'podcasts'],
  placeholder: 'plays:>0 sort:-listened   — or just words',
  list: podcastsList,
  presets: podcastPresets,
  id: (podcast) => podcast.uuid,
  lead: {
    label: 'Podcast',
    cell: (podcast) => (
      <LeadCell
        artwork={<Artwork src={podcast.thumbnail} className="w-10" />}
        title={<Link to="/podcasts/$uuid" params={{ uuid: podcast.uuid }} className="font-semibold">{podcast.title}</Link>}
        byline={podcast.author || '—'}
      />
    ),
  },
  expand: {
    panel: (podcast) => <PodcastPanel podcast={podcast} />,
    label: (podcast) => `Details for ${podcast.title}`,
  },
  card: (podcast, fields, size) => <PodcastCard podcast={podcast} size={size === 'lane' ? 'small' : size} fields={fields} />,
}
