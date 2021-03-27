import moment from 'moment'

export function daysAgo (days) {
  return moment().add(-days, 'days').toISOString()
}
export function humanDuration (durationSeconds) {
  const d = moment.duration(durationSeconds, 'seconds')
  // return d.humanize()
  return moment.utc(d.asMilliseconds()).format('HH:mm')
}

// fromNow - a few seconds ago!
export function fromNow (when) {
  return moment(when).fromNow()
}
