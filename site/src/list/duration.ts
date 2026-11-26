// Durations as the query line types them and the lists show them: seconds,
// written as units in descending order, each at most once (`45m`, `1h30m`,
// `2d4h`, `90s`). Shared by the query model's duration kind and the cells.

// Each unit's seconds, largest first.
const units = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]] as const
// What a formatted duration shows: each unit's minutes, largest first.
const shownUnits = [['d', 1440], ['h', 60], ['m', 1]] as const

const typed = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/

// Seconds, or none when the text isn't a duration: a bare number is not
// one, so `90` never has to mean seconds or minutes.
export function parseDuration(text: string): number | undefined {
  const match = typed.exec(text)
  if (!text || !match) return undefined
  return units.reduce((seconds, [, size], index) => seconds + Number(match[index + 1] ?? 0) * size, 0)
}

// Rounded to minutes, zero units left out: `1h9m`, `2d4h20m`, `1h`; `0m`
// under half a minute.
export function formatDuration(seconds: number): string {
  let minutes = Math.round(seconds / 60)
  const parts: string[] = []
  for (const [unit, size] of shownUnits) {
    const count = Math.floor(minutes / size)
    minutes -= count * size
    if (count) parts.push(`${count}${unit}`)
  }
  return parts.join('') || '0m'
}
