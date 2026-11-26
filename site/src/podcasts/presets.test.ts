import { expect, test } from 'vite-plus/test'
import { podcastsList } from './list'
import { podcastPresets } from './presets'

test('every preset parses with nothing not understood', () => {
  for (const { label, query } of podcastPresets) {
    expect({ label, notUnderstood: podcastsList.parse(query).notUnderstood }).toEqual({ label, notUnderstood: [] })
  }
})
