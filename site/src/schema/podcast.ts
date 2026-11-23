// Podcast and episode records, as the history API (`js/`, the scraper)
// returns them: Pocket Casts items accumulated from several sources over the
// years, so key sets differ within one type. Only the fields the site reads
// are checked; other keys pass through. Required unless the data says
// otherwise, judged by inspecting every record on 2026-11-22 (413 podcasts,
// 167,014 episodes); the counts below are from that day.
import { z } from 'zod'

export const PodcastRecord = z.looseObject({
  uuid: z.string(),
  title: z.string(),
  // null on 1 of 413
  author: z.string().nullable(),
  description: z.string(),
  // missing on 250 of 413, null on 1
  thumbnail_url: z.string().nullable().optional(),
  meta: z.looseObject({
    __type: z.literal('podcast'),
    __firstSeen: z.iso.datetime(),
  }),
})
export type PodcastRecord = z.infer<typeof PodcastRecord>

export const EpisodeRecord = z.looseObject({
  uuid: z.string(),
  title: z.string(),
  podcast_uuid: z.string(),
  // seconds; digits as a string on 28,670 older records, missing on 2,991
  duration: z.union([z.number(), z.string().regex(/^\d+$/)]).optional(),
  // seconds; missing on 2,151, the same records as history.played_up_to
  played_up_to: z.number().optional(),
  meta: z.looseObject({
    __type: z.literal('episode'),
    // on 31,890 of 167,014
    __lastPlayed: z.iso.datetime().optional(),
  }),
  history: z.looseObject({
    // played_up_to by the time it was seen; missing on 2,151
    played_up_to: z.record(z.iso.datetime(), z.number()).optional(),
  }),
})
export type EpisodeRecord = z.infer<typeof EpisodeRecord>

export const PodcastRecords = z.array(PodcastRecord)
export const EpisodeRecords = z.array(EpisodeRecord)
