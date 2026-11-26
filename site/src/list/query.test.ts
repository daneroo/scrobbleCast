import { expect, test } from 'vite-plus/test'
import { defineList } from './query'
import type { Field, ListDefinition, Query } from './query'

// A test-only list: pots of paint, each with a name, a size, a colour, the
// date it was made and tags.
interface Pot {
  name: string
  note: string
  size?: number
  colour: string
  price?: number
  stock?: number
  made?: string
  tags?: string[]
}

const colours = ['red', 'dark-red', 'blue', 'green']

const potList: ListDefinition<Pot, Field<Pot>> = {
  fields: [
    { key: 'name', label: 'Name', kind: 'text', value: (pot) => pot.name },
    { key: 'size', aliases: ['litres'], label: 'Size', kind: 'number', value: (pot) => pot.size },
    { key: 'colour', aliases: ['color'], label: 'Colour', kind: 'choice', choices: colours, value: (pot) => pot.colour },
    { key: 'note', label: 'Note', kind: 'text', value: (pot) => pot.note },
    { key: 'price', label: 'Price', kind: 'number', value: (pot) => pot.price, alsoShow: ['size'], note: 'in pounds', example: 'price:<5' },
    // None in stock is 0 to filter on, and no value to sort and show.
    { key: 'stock', label: 'Stock', kind: 'number', value: (pot) => pot.stock, filterValue: (pot) => pot.stock ?? 0 },
    { key: 'made', label: 'Made', kind: 'date', value: (pot) => pot.made },
    { key: 'tag', label: 'Tag', kind: 'tags', value: (pot) => pot.tags?.join(', '), filterValue: (pot) => pot.tags, example: 'tag:indoor,gloss' },
  ],
  searchKeys: ['name', 'note'],
  defaultSort: [{ key: 'size', descending: true }],
  lead: ['name'],
  // The colour, unless the query filters on it; then size and note.
  pinned: (query) => query.filters.some(({ key }) => key === 'colour') ? [] : ['colour'],
  fill: () => ['size', 'note'],
  fillTo: 3,
  most: 4,
  help: { words: 'name and note', sort: 'sort:colour,-size', show: 'show:note,size' },
}

const pots = defineList(potList)

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

test('a field can filter on another value than it shows', () => {
  const items: Pot[] = [
    { name: 'Full', note: '', colour: 'red', stock: 3 },
    { name: 'Empty', note: '', colour: 'red' },
  ]
  expect(names('stock:0', items)).toEqual(['Empty'])
  expect(names('stock:<5 sort:name', items)).toEqual(['Empty', 'Full'])
  expect(names('sort:-stock', items)).toEqual(['Full', 'Empty'])
  expect(names('sort:stock', items)).toEqual(['Full', 'Empty'])
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

test('a date sorts newest first on the first click', () => {
  expect(click('matte', 'made')).toBe('matte sort:-made')
})

// Pots made over the ages: BC, before the year 1000, and recent days.
const ages: Pot[] = [
  { name: 'Amphora', note: '', colour: 'red', made: '-0750' },
  { name: 'Urn', note: '', colour: 'red', made: '-0100' },
  { name: 'Bowl', note: '', colour: 'blue', made: '0850' },
  { name: 'Jug', note: '', colour: 'blue', made: '1949' },
  { name: 'Vase', note: '', colour: 'green', made: '2024-05' },
  { name: 'Tin', note: '', colour: 'green', made: '2024-06-01T07:00:00.000Z' },
  { name: 'Can', note: '', colour: 'red', made: '2025-02-14T08:00:00.000Z' },
  { name: 'Box', note: '', colour: 'red' },
]

function made(text: string) {
  return names(`${text} sort:made`, ages)
}

test('a date filter compares at the year typed', () => {
  expect(made('made:2024')).toEqual(['Vase', 'Tin'])
  expect(made('made:=2024')).toEqual(['Vase', 'Tin'])
  expect(made('made:>2024')).toEqual(['Can'])
  expect(made('made:>=2024')).toEqual(['Vase', 'Tin', 'Can'])
  expect(made('made:<=1949')).toEqual(['Amphora', 'Urn', 'Bowl', 'Jug'])
})

test('a date filter compares at the month or day typed', () => {
  expect(made('made:2024-06')).toEqual(['Tin'])
  expect(made('made:>=2024-06')).toEqual(['Tin', 'Can'])
  expect(made('made:<2024-06')).toEqual(['Amphora', 'Urn', 'Bowl', 'Jug', 'Vase'])
  expect(made('made:2024-06-01')).toEqual(['Tin'])
  expect(made('made:>2024-06-01')).toEqual(['Can'])
})

test('a date less precise than the one typed matches only when it is clearly on one side', () => {
  // Vase is May 2024, its day unknown: before or after the 10th, it can't say.
  expect(made('made:<2024-05-10')).toEqual(['Amphora', 'Urn', 'Bowl', 'Jug'])
  expect(made('made:>=2024-05-10')).toEqual(['Tin', 'Can'])
  expect(made('made:2024-05-10')).toEqual([])
  expect(made('made:<2024-06-15')).toEqual(['Amphora', 'Urn', 'Bowl', 'Jug', 'Vase', 'Tin'])
})

test('years before 1000 and BC years compare in time order', () => {
  expect(made('made:<1000')).toEqual(['Amphora', 'Urn', 'Bowl'])
  expect(made('made:<0')).toEqual(['Amphora', 'Urn'])
  expect(made('made:-750')).toEqual(['Amphora'])
  expect(made('made:>-500')).toEqual(['Urn', 'Bowl', 'Jug', 'Vase', 'Tin', 'Can'])
  expect(made('made:850')).toEqual(['Bowl'])
})

test('dates sort in time order, BC first, no value last', () => {
  expect(names('sort:made', ages)).toEqual(['Amphora', 'Urn', 'Bowl', 'Jug', 'Vase', 'Tin', 'Can', 'Box'])
  expect(names('sort:-made', ages)).toEqual(['Can', 'Tin', 'Vase', 'Jug', 'Bowl', 'Urn', 'Amphora', 'Box'])
})

test('a date filter takes a year, month or day, with an operator', () => {
  expect(pots.parse('made:2024-13 made:2024-06-32 made:June made:2024-6 made:>=x made:12345').notUnderstood)
    .toEqual(['made:2024-13', 'made:2024-06-32', 'made:June', 'made:2024-6', 'made:>=x', 'made:12345'])
  expect(pots.format(pots.parse('made:>=2024-06'))).toBe('made:>=2024-06')
})

test('a tags filter takes a comma list, and a pot with any of them matches', () => {
  const items: Pot[] = [
    { name: 'Gloss', note: '', colour: 'red', tags: ['outdoor', 'gloss'] },
    { name: 'Primer', note: '', colour: 'blue', tags: ['indoor'] },
    { name: 'Plain', note: '', colour: 'blue', tags: [] },
    { name: 'Old', note: '', colour: 'green' },
  ]
  expect(names('tag:outdoor sort:name', items)).toEqual(['Gloss'])
  expect(names('tag:Indoor,gloss sort:name', items)).toEqual(['Gloss', 'Primer'])
  expect(names('tag:door sort:name', items)).toEqual([])
  expect(names('tag:indoor tag:gloss', items)).toEqual([])
  expect(pots.parse('tag: tag:a,,b').notUnderstood).toEqual(['tag:', 'tag:a,,b'])
})

test('tags only filter: sort: and show: refuse them, a filter on them adds no field, a click does nothing', () => {
  expect(pots.parse('sort:tag show:tag sort:-name,tag').notUnderstood).toEqual(['sort:tag', 'show:tag', 'sort:-name,tag'])
  expect(shown('tag:indoor')).toEqual(shown(''))
  expect(click('matte', 'tag')).toBe('matte')
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

test('the help lists every field in order, with its label, aliases, whether it sorts, and an example', () => {
  const { fields } = pots.help()
  expect(fields.map(({ key }) => key)).toEqual(['name', 'size', 'colour', 'note', 'price', 'stock', 'made', 'tag'])
  expect(fields[1]).toMatchObject({ label: 'Size', aliases: ['litres'], sorts: true })
  expect(fields.at(-1)).toMatchObject({ label: 'Tag', aliases: [], sorts: false })
  for (const { key, example } of fields) {
    expect(example).toMatch(new RegExp(`^${key}:.`))
    expect(pots.parse(example).notUnderstood).toEqual([])
  }
})

test("the help says how each kind is typed, and gives a field's own note and example", () => {
  const { fields } = pots.help()
  const help = (key: string) => fields.find((field) => field.key === key)
  expect(help('colour')?.syntax).toContain('red, dark-red, blue, green')
  expect(help('size')?.syntax).toContain('>=')
  expect(help('made')?.syntax).toContain('2024-06')
  expect(help('price')).toMatchObject({ note: 'in pounds', example: 'price:<5', alsoShow: ['size'] })
  expect(help('tag')?.example).toBe('tag:indoor,gloss')
})

test('the help says what words search, and how to sort and show', () => {
  const { words, sort, show } = pots.help()
  expect(words).toContain('name and note')
  expect(sort.example).toBe('sort:colour,-size')
  expect(show.example).toBe('show:note,size')
  expect(pots.parse(`${sort.example} ${show.example}`).notUnderstood).toEqual([])
})

test('adding a field adds it to the help', () => {
  const shine: Field<Pot> = { key: 'shine', label: 'Shine', kind: 'number', value: () => 1 }
  const more = defineList<Pot>({ ...potList, fields: [...potList.fields, shine] })
  expect(more.help().fields.map(({ key }) => key)).toEqual(['name', 'size', 'colour', 'note', 'price', 'stock', 'made', 'tag', 'shine'])
})

test('a help example the query does not understand fails the list', () => {
  const field: Field<Pot> = { key: 'shine', label: 'Shine', kind: 'number', value: () => 1, example: 'shine:high' }
  expect(() => defineList<Pot>({ ...potList, fields: [...potList.fields, field] })).toThrow('shine:high')
  expect(() => defineList<Pot>({ ...potList, help: { ...potList.help, sort: 'sort:tag' } })).toThrow('sort:tag')
})
