import type { Podcast } from '../data/podcasts'
import { DetailPage, Found, byline, description, detailArtwork, detailHeading, metadata, usePageTitle } from '../detail'
import { day } from '../format'
import { Artwork, Heading } from '../ui'

export function PodcastDetail({ podcast }: { podcast: Promise<Podcast | undefined> }) {
  return (
    <DetailPage back="/podcasts" label="Podcasts">
      <Found record={podcast}>{(podcast) => <PodcastInfo podcast={podcast} />}</Found>
    </DetailPage>
  )
}

function PodcastInfo({ podcast }: { podcast: Podcast }) {
  usePageTitle(podcast.title)
  return (
    <>
      <div className={detailHeading}>
        <Artwork src={podcast.thumbnail} className={detailArtwork} />
        <div>
          <Heading>{podcast.title}</Heading>
          {podcast.author && <p className={byline}>{podcast.author}</p>}
          {podcast.firstSeen && <p className={metadata}>In the catalog since {day(podcast.firstSeen)}</p>}
        </div>
      </div>
      {podcast.description && <p className={description}>{podcast.description}</p>}
    </>
  )
}
