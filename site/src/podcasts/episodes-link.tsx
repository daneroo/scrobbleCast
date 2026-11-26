import { Link } from '@tanstack/react-router'
import { episodesPage } from '../episodes/page'
import { rememberListQuery } from '../list/state'

export function PodcastEpisodesLink({ uuid }: { uuid: string }) {
  return (
    <Link
      to="/episodes"
      onClick={(event) => {
        // Only seed the query when the link is activated in this tab.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
        rememberListQuery(episodesPage.name, `podcast:${uuid.slice(0, 8)}`)
      }}
    >
      See its episodes
    </Link>
  )
}
