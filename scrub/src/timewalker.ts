// All dates expressed in UTC strings

export type Interval = {
  since: string;
  before: string;
};

export function trimMillis(stamp: string) {
  return stamp.replace(/\.\d{1,7}Z$/, "Z");
}

// When scrobblecast started - earliest data we have
export const epoch = "2014-11-01T00:00:00Z";

export function startOfDayUTC(stamp: string): string {
  const d = new Date(Date.parse(stamp));
  // find beginning of month (UTC)
  const day = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString();
  // iso8601, remove millis
  return trimMillis(day);
}
export function startOfMonthUTC(stamp: string): string {
  const d = new Date(Date.parse(stamp));
  // find beginning of month (UTC)
  const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()))
    .toISOString();
  // iso8601, remove millis
  return trimMillis(month);
}

// not UTC related but matches the names of the other functions, and does not clash with imported addDays
export function addDaysUTC(stamp: string, days: number): string {
  const d = new Date(stamp);
  d.setUTCDate(d.getUTCDate() + days);
  return trimMillis(d.toISOString());
}
// not UTC related but matches the names of the other functions, and does not clash with imported addDays
export function addMonthsUTC(stamp: string, months: number): string {
  const d = new Date(stamp);
  d.setUTCMonth(d.getUTCMonth() + months);
  return trimMillis(d.toISOString());
}

export function* walkDaysUTC(
  since: string,
  before: string,
): IterableIterator<Interval> {
  let current = startOfDayUTC(since);
  let next = addDaysUTC(current, 1);
  while (current < before && next < before) {
    yield { since: current, before: next };
    current = next;
    next = addDaysUTC(current, 1);
  }
}

export function* walkMonthsUTC(
  since: string,
  before: string,
): IterableIterator<Interval> {
  if (since >= before) {
    return;
  }
  let current = startOfMonthUTC(since);
  let next = addMonthsUTC(current, 1);
  while (current < before && next < before) {
    yield { since: current, before: next };
    current = next;
    next = addMonthsUTC(current, 1);
  }
}
