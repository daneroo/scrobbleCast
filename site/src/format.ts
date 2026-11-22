import type { Episode } from './data'

export function playedPercent(episode: Episode) {
  return episode.duration ? Math.round(100 * episode.playedSeconds / episode.duration) : 0
}

export function day(value: string) {
  return value ? value.slice(0, 10) : '—'
}
