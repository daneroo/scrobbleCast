import { expect, test } from 'vite-plus/test'
import { episodesList } from './list'
import { episodePresets } from './presets'

test('every preset parses with nothing not understood', () => {
  for (const { label, query } of episodePresets) {
    expect({ label, notUnderstood: episodesList.parse(query).notUnderstood }).toEqual({ label, notUnderstood: [] })
  }
})
