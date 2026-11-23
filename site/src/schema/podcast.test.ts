import { expect, test } from 'vite-plus/test'
import example from './podcast-example.json'
import { EpisodeRecords, PodcastRecords } from './podcast'

test('real podcast records parse, with or without a thumbnail', () => {
  expect(PodcastRecords.parse(example.podcasts)).toHaveLength(2)
})

test('real episode records parse, from today and from 2018', () => {
  expect(EpisodeRecords.parse(example.episodes)).toHaveLength(2)
})

test('a podcast without a uuid is rejected', () => {
  const { uuid: _, ...podcast } = example.podcasts[0]
  expect(PodcastRecords.safeParse([podcast]).success).toBe(false)
})

test('an episode record is not a podcast record', () => {
  expect(PodcastRecords.safeParse([example.episodes[0]]).success).toBe(false)
})
