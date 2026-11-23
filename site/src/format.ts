import type { Episode } from './data/podcasts'

export function playedPercent(episode: Episode) {
  return episode.duration ? Math.round(100 * episode.playedSeconds / episode.duration) : 0
}

export function day(value: string) {
  return value ? value.slice(0, 10) : '—'
}

// The sv-SE locale formats local time as "YYYY-MM-DD HH:mm:ss".
export function localTime(date: Date) {
  return date.toLocaleString('sv-SE')
}

export function documentTitle(title: string) {
  return `${title} · Scrobble Cast`
}
