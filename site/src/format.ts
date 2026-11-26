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

// A local day, "YYYY-MM-DD".
export function localDay(date: Date) {
  return date.toLocaleDateString('sv-SE')
}
