import { expect, test } from 'vite-plus/test'
import { defineList } from './query'
import type { Query } from './query'

// A test-only list: pots of paint, each with a name, a size and a colour.
interface Pot {
  name: string
  note: string
  size?: number
  colour: string
  price?: number
  stock?: number
  made?: string
}

const colours = ['red', 'dark-red', 'blue', 'green']

const pots = defineList<Pot>({
  fields: [
    { key: 'name', label: 'Name', kind: 'text', value: (pot) => pot.name },
    { key: 'size', aliases: ['litres'], label: 'Size', kind: 'number', value: (pot) => pot.size },
    { key: 'colour', aliases: ['color'], label: 'Colour', kind: 'choice', choices: colours, value: (pot) => pot.colour },
    { key: 'note', label: 'Note', kind: 'text', value: (pot) => pot.note },
    { key: 'price', label: 'Price', kind: 'number', value: (pot) => pot.price, alsoShow: ['size'] },
    { key: 'stock', label: 'Stock', kind: 'number', value: (pot) => pot.stock },
    { key: 'made', label: 'Made', kind: 'date', value: (pot) => pot.made },
  ],
  searchKeys: ['name', 'note'],
  defaultSort: [{ key: 'size', descending: true }],
  lead: ['name'],
  // The colour, unless the query filters on it; then size and note.
  pinned: (query) => query.filters.some(({ key }) => key === 'colour') ? [] : ['colour'],
  fill: () => ['size', 'note'],
  fillTo: 3,
  most: 4,
})

test('a query formats back as typed, with canonical keys', () => {
  expect(pots.format(pots.parse('  matte   litres:>2 color:red  sort:-litres,name ')))
    .toBe('matte size:>2 colour:red sort:-size,name')
})

test('tokens not understood are kept as typed, in place', () => {
  const query = pots.parse('matte weight:3 size:big colour:purple Sort:name')
  expect(query.notUnderstood).toEqual(['weight:3', 'size:big', 'colour:purple'])
  expect(pots.format(query)).toBe('matte weight:3 size:big colour:purple sort:name')
})

test('a formatted query parses to the same query', () => {
  const text = 'matte size:<=4 colour:red,blue name:pot sort:colour,-size show:note,size oops:1'
  const query: Query = pots.parse(text)
  expect(pots.parse(pots.format(query))).toEqual(query)
  expect(pots.format(query)).toBe(text)
})

const shelf: Pot[] = [
  { name: 'Ochre', note: 'warm and earthy', size: 4, colour: 'red' },
  { name: 'Claret', note: 'deep wine', size: 1, colour: 'dark-red' },
  { name: 'Sky', note: 'pale and airy', size: 2.5, colour: 'blue' },
  { name: 'Moss', note: 'earthy green', colour: 'green' },
  { name: 'Sea', note: 'blue green', size: 10, colour: 'blue' },
]

// The names of the pots a query finds, in order.
function names(text: string, items: Pot[] = shelf) {
  return pots.run(items, pots.parse(text)).map(({ name }) => name)
}

test('number filters compare with > < >= <= =, a bare value meaning =', () => {
  expect(names('size:>2.5 sort:name')).toEqual(['Ochre', 'Sea'])
  expect(names('size:<2.5 sort:name')).toEqual(['Claret'])
  expect(names('size:>=2.5 sort:name')).toEqual(['Ochre', 'Sea', 'Sky'])
  expect(names('size:<=2.5 sort:name')).toEqual(['Claret', 'Sky'])
  expect(names('size:=4')).toEqual(['Ochre'])
  expect(names('size:4')).toEqual(['Ochre'])
})

test('a pot with no size matches no size filter', () => {
  expect(names('size:<100 sort:name')).not.toContain('Moss')
})

test('choice filters take a comma list, and a value that is no colour matches every colour containing it', () => {
  expect(names('colour:blue,green sort:name')).toEqual(['Moss', 'Sea', 'Sky'])
  expect(names('colour:red sort:name')).toEqual(['Ochre'])
  expect(names('colour:Dark sort:name')).toEqual(['Claret'])
  expect(names('colour:re sort:name')).toEqual(['Claret', 'Moss', 'Ochre'])
})

test('text filters are a case-insensitive contains', () => {
  expect(names('note:EARTHY sort:name')).toEqual(['Moss', 'Ochre'])
})

test('repeated filters all apply', () => {
  expect(names('note:earthy colour:red')).toEqual(['Ochre'])
  expect(names('size:>1 size:<10 sort:name')).toEqual(['Ochre', 'Sky'])
})

test('a token not understood does not change the results', () => {
  const query = pots.parse('size:big colour:purple weight:3 sort:name,shine')
  expect(query.notUnderstood).toEqual(['size:big', 'colour:purple', 'weight:3', 'sort:name,shine'])
  expect(pots.run(shelf, query)).toEqual(pots.run(shelf, pots.parse('')))
})

test('every word must match the name or the note', () => {
  expect(names('earthy sort:name')).toEqual(['Moss', 'Ochre'])
  expect(names('earthy green')).toEqual(['Moss'])
  expect(names('earthy wine')).toEqual([])
})

test('words and filters both apply', () => {
  // "green" finds Moss and Sea; only Sea is blue.
  expect(names('green colour:blue')).toEqual(['Sea'])
})

test('words alone keep their relevance', () => {
  // Listed, and by size, Pink comes first; Seashell matches the word better.
  const items = [
    { name: 'Pink', note: 'the inside of a seashell', size: 9, colour: 'red' },
    { name: 'Seashell', note: 'off-white', size: 1, colour: 'blue' },
  ]
  expect(names('seashell', items)).toEqual(['Seashell', 'Pink'])
})

test('a query without words takes the default sort', () => {
  expect(names('')).toEqual(['Sea', 'Ochre', 'Sky', 'Claret', 'Moss'])
  expect(names('colour:blue')).toEqual(['Sea', 'Sky'])
})

test('an explicit sort wins over relevance', () => {
  expect(names('earthy sort:-name')).toEqual(['Ochre', 'Moss'])
})

test('later sorts break ties, minus meaning high first', () => {
  expect(names('sort:colour,-size')).toEqual(['Sea', 'Sky', 'Claret', 'Moss', 'Ochre'])
  expect(names('sort:colour,size')).toEqual(['Sky', 'Sea', 'Claret', 'Moss', 'Ochre'])
})

test('no value sorts last, whichever the direction', () => {
  expect(names('sort:size').at(-1)).toBe('Moss')
  expect(names('sort:-size').at(-1)).toBe('Moss')
})

test('the last sort wins, and a field repeated in it counts once', () => {
  const query = pots.parse('sort:name sort:-size,colour,size')
  expect(query.sorts).toEqual([{ key: 'size', descending: true }, { key: 'colour', descending: false }])
  expect(names('sort:name sort:-size')).toEqual(['Sea', 'Ochre', 'Sky', 'Claret', 'Moss'])
})

// The query's text after a header click on `key`.
function click(text: string, key: string) {
  return pots.format(pots.sortBy(pots.parse(text), key))
}

test('a header click first sorts numbers high first, text and choices A to Z', () => {
  expect(click('matte', 'size')).toBe('matte sort:-size')
  expect(click('matte', 'name')).toBe('matte sort:name')
  expect(click('matte', 'colour')).toBe('matte sort:colour')
})

test('a date sorts newest first on the first click, and takes no filter yet', () => {
  expect(click('matte', 'made')).toBe('matte sort:-made')
  const items = [
    { name: 'Old', note: '', colour: 'red', made: '2019-05-01' },
    { name: 'New', note: '', colour: 'red', made: '2024-02-03' },
  ]
  expect(names('sort:-made', items)).toEqual(['New', 'Old'])
  expect(pots.parse('made:2024').notUnderstood).toEqual(['made:2024'])
})

test('a second click on the main sort flips it', () => {
  expect(click('sort:-size', 'size')).toBe('sort:size')
  expect(click(click('matte', 'name'), 'name')).toBe('matte sort:-name')
})

test('without words or sort:, the order is the default sort, and a click starts from it', () => {
  expect(pots.parse('colour:blue').order).toEqual([{ key: 'size', descending: true }])
  expect(pots.parse('matte').order).toEqual([])
  expect(pots.parse('matte sort:name').order).toEqual([{ key: 'name', descending: false }])
  expect(click('', 'size')).toBe('sort:size')
  expect(click('colour:blue', 'name')).toBe('colour:blue sort:name,-size')
})

test('a click makes the field the main sort, earlier sorts kept as tie-breaks', () => {
  expect(click('sort:-size,name', 'colour')).toBe('sort:colour,-size,name')
  expect(click('sort:-size,name', 'name')).toBe('sort:name,-size')
})

test('a click rewrites sort: in place, keeping every other token as typed', () => {
  expect(click('matte sort:name colour:blue oops:1', 'size')).toBe('matte sort:-size,name colour:blue oops:1')
  expect(click('matte litres:>2 sort:name,shine', 'size')).toBe('matte size:>2 sort:name,shine sort:-size')
  expect(click('sort:name matte sort:size', 'colour')).toBe('matte sort:colour,size')
})

// The keys of the fields a query shows.
function shown(text: string) {
  return pots.shown(pots.parse(text)).map(({ key }) => key)
}

test('show: gives exactly the fields it lists', () => {
  expect(shown('stock:>1 sort:price show:note,name,litres')).toEqual(['note', 'name', 'size'])
})

test('without show:, the pinned fields, then the fill', () => {
  expect(shown('')).toEqual(['colour', 'size', 'note'])
})

test('filtered fields come after the pinned ones, then the fill up to its number', () => {
  expect(shown('stock:>1')).toEqual(['colour', 'stock', 'size'])
  expect(shown('note:wine')).toEqual(['colour', 'note', 'size'])
})

test('every result shares a number = filter\'s value, so it adds no field', () => {
  expect(shown('stock:3')).toEqual(['colour', 'size', 'note'])
  expect(shown('stock:=3')).toEqual(['colour', 'size', 'note'])
})

test('every result shares a one-value choice filter\'s value, so it adds no field', () => {
  expect(shown('colour:red')).toEqual(['size', 'note'])
  // `dark` names one colour, dark-red.
  expect(shown('colour:dark')).toEqual(['size', 'note'])
})

test('a choice filter with several values adds its field', () => {
  expect(shown('colour:blue,green')).toEqual(['colour', 'size', 'note'])
  // `re` names three: red, dark-red and green.
  expect(shown('colour:re')).toEqual(['colour', 'size', 'note'])
})

test('a filtered field brings its also-show fields, ahead of it', () => {
  expect(shown('price:>2')).toEqual(['colour', 'size', 'price'])
})

test('sorted fields come after the filtered ones; a sort on a lead-column field adds no field', () => {
  expect(shown('sort:name,-stock')).toEqual(['colour', 'stock', 'size'])
  expect(shown('note:wine sort:name,-stock')).toEqual(['colour', 'note', 'stock'])
})

test('a filter on a lead-column field adds no field', () => {
  expect(shown('name:sky')).toEqual(['colour', 'size', 'note'])
})

test("at most the list's most fields, without repeats", () => {
  expect(shown('stock:>1 price:>1 size:<9 note:wine sort:-stock')).toEqual(['colour', 'stock', 'size', 'price'])
})
