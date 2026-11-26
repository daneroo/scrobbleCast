import { Link } from '@tanstack/react-router'
import type { Episode } from '../data/podcasts'
import { DetailPage, Found, Stat, byline, usePageTitle } from '../detail'
import { day } from '../format'
import { formatDuration } from '../list/duration'
import { Heading } from '../ui'

export function EpisodeDetail({ episode }: { episode: Promise<Episode | undefined> }) {
  return (
    <DetailPage back="/episodes" label="Episodes">
      <Found record={episode}>{(episode) => <EpisodeInfo episode={episode} />}</Found>
    </DetailPage>
  )
}

function EpisodeInfo({ episode }: { episode: Episode }) {
  usePageTitle(episode.title)
  return (
    <>
      <Heading>{episode.title}</Heading>
      {episode.podcastId && episode.podcastTitle && (
        <p className={byline}><Link to="/podcasts/$uuid" params={{ uuid: episode.podcastId }}>{episode.podcastTitle}</Link></p>
      )}
      <dl className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
        <Stat label="Played">{episode.progress === undefined ? '—' : `${Math.round(episode.progress)}%`}</Stat>
        <Stat label="Duration">{episode.duration ? formatDuration(episode.duration) : '—'}</Stat>
        <Stat label="First played">{day(episode.firstPlayed)}</Stat>
        <Stat label="Last played">{day(episode.lastPlayed)}</Stat>
      </dl>
    </>
  )
}
