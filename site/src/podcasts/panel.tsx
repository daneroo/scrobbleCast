import type { Podcast } from '../data/podcasts'
import { PanelFact, PanelTime, RowPanel } from '../list/panel'
import { cellOf } from '../list/table'
import { Artwork } from '../ui'
import { PodcastEpisodesLink } from './episodes-link'
import { podcastFields } from './list'

const { author, since, added, plays, listened, lastPlayed } = podcastFields

export function PodcastPanel({ podcast }: { podcast: Podcast }) {
  return (
    <RowPanel artwork={<Artwork src={podcast.thumbnail} className="w-16 self-start sm:w-32" />}>
      <div className="grid min-w-0 content-start gap-3 text-sm wrap-anywhere">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <PanelFact label={author.label}>{cellOf(author, podcast) ?? '—'}</PanelFact>
          <PanelFact label={since.label}><PanelTime value={podcast.firstSeen} /></PanelFact>
          <PanelFact label={added.label}><PanelTime value={podcast.added} /></PanelFact>
          <PanelFact label={plays.label}>{cellOf(plays, podcast)}</PanelFact>
          <PanelFact label={listened.label}>{cellOf(listened, podcast)}</PanelFact>
          <PanelFact label={lastPlayed.label}><PanelTime value={podcast.playTotals?.lastPlayed} /></PanelFact>
          <PanelFact label="Website">
            {podcast.url ? <a href={podcast.url} target="_blank" rel="noreferrer">Open site</a> : '—'}
          </PanelFact>
        </dl>
        <p className="whitespace-pre-line text-muted-foreground">{podcast.description || '—'}</p>
        <p><PodcastEpisodesLink uuid={podcast.uuid} /></p>
      </div>
    </RowPanel>
  )
}
