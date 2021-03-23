// https://www.npmjs.com/package/xml2json - no cdata
// Trying https://www.npmjs.com/package/xml2js as in https://attacomsian.com/blog/nodejs-convert-xml-to-json

const { parseStringPromise } = require('xml2js')
const { promises: fs } = require('fs')
const { join } = require('path')

const fetch = require('node-fetch')

// const exampleFilename = 'goodreads-rss-2021-03-22T12.47.00.xml'
const URI = 'https://www.goodreads.com/review/list_rss/6883912'
const key = '9C2oDNblCg8nchKHD5aYs_gzgVmR5mpfiCi8B7WP0_IS0jMW'
// const URIALL = 'https://www.goodreads.com/review/list_rss/6883912?key=9C2oDNblCg8nchKHD5aYs_gzgVmR5mpfiCi8B7WP0_IS0jMW&shelf=%23ALL%23'
const shelves = ['#ALL#', 'read', 'currently-reading', 'to-read', 'on-deck']
// const fileName = 'goodreads-rss-2021-03-22T12.47.00.xml'
const dataDirectory = join(process.cwd(), 'data')
const booksDirectory = join(dataDirectory, 'books')

main()

async function main () {
  try {
    const stamp = dateFileStamp(new Date())
    const feed = { // indicate provenance - at least build stamp
      title: "Daniel's bookshelf: all",
      // title: 'ReplaceMe',
      lastBuildDate: stamp,
      items: [] // Where we will accumulate the pages items
    }
    const runDirectory = join(booksDirectory, stamp)
    await fs.mkdir(runDirectory, { recursive: true })

    // const asXML = await fs.readFile(exampleFilename, { encoding: 'utf8' })
    // const response = await fetch(URI)
    // const asXML = await response.text()
    const shelf = shelves[0]

    //  could be omitted as it is the default
    // eslint-disable-next-line camelcase
    // const per_page = 100 // unreliable but 10 and 100 work - perhaps caching is at issue.
    // page index is 1 based, of course it is.
    for (let page = 1; page < 10; page++) {
      const asXML = await fetcherXML(URI, { key, shelf, page })

      const bookFilePFX = join(runDirectory, `goodreads-rss-p${page}-${stamp}`)
      const bookFileXML = `${bookFilePFX}.xml`
      await fs.writeFile(bookFileXML, asXML)

      const pageFeed = await parseStringPromise(asXML)
      const { rss: { channel } } = pageFeed
      const title = channel?.[0]?.title?.[0]
      feed.title = title // overwrite on every page - should all be the same
      const lastBuildDate = channel?.[0]?.lastBuildDate?.[0]
      const count = (channel?.[0].item || []).length
      console.log(`${title} page:${page} count:${count} build:${lastBuildDate}`)

      // const bookFileJSON = `${bookFilePFX}.json`
      // const asJSON = JSON.stringify(pageFeed, null, 2)
      // await fs.writeFile(bookFileJSON, asJSON)

      //   prettyFeed(feed)
      const pageItems = cleanFeed(pageFeed)

      if (!pageItems || pageItems.length === 0) {
        // console.log('No more items')
        break
      }
      // if (pageItems.length > 0) {
      //   console.log(pageItems[0])
      // }
      feed.items = feed.items.concat(pageItems)
    }
    // accumulated over pages: no '-pX' part in filename
    prettyFeed(feed)
    // my format
    const bookFilePFX = join(runDirectory, `goodreads-rss-${stamp}`)
    const bookFileJSON = `${bookFilePFX}.json`
    const asJSON = JSON.stringify(feed, null, 2)
    await fs.writeFile(bookFileJSON, asJSON)
  } catch (err) {
    console.error(err)
  }
}

// for xml:
async function fetcherXML (URI, qs = { }) {
  const qss = new URLSearchParams(qs).toString()
  const url = `${URI}?${qss}`
  // eslint-disable-next-line no-undef
  const response = await fetch(url)
  // console.info('fetched', url)
  //   const object = await results.json()
  //   return object
  const asXML = await response.text()
  return asXML
//   const feed = await parseStringPromise(asXML)
//   return feed
}

// More validation - all levels
function cleanFeed (feed) {
  const { rss: { channel } } = feed
  if (!Array.isArray(channel) || channel.length !== 1) {
    console.error('Channel should be an array of size 1')
  }

  // item: may not be be present if no more items - ?break condition for loop
  const items = channel?.[0].item ?? []// which is an array
  return items.map(cleanItem)
}

function cleanItem (item) {
  const fieldMap = {
    guid: 'guid',
    pubDate: 'pubDate',
    title: 'title',
    link: 'link',
    bookId: 'book_id',
    bookImageURL: 'book_image_url',
    // book_small_image_url: 'book_small_image_url',
    // book_medium_image_url: 'book_medium_image_url',
    // book_large_image_url: 'book_large_image_url',
    bookDescription: 'book_description',
    // book: 'book', // <book id="13641406"> <num_pages>172</num_pages> </book>
    authorName: 'author_name',
    isbn: 'isbn',
    userName: 'user_name',
    userRating: 'user_rating',
    userReadAt: 'user_read_at',
    userDateAdded: 'user_date_added',
    userDateCreated: 'user_date_created',
    userShelves: 'user_shelves',
    userReview: 'user_review',
    averageRating: 'average_rating',
    bookPublished: 'book_published',
    description: 'description'
  }
  const newItem = { }
  for (const [newName, oldName] of Object.entries(fieldMap)) {
    //  check if array of length 1
    newItem[newName] = item[oldName][0]
  }
  // <book id="13641406"> <num_pages>172</num_pages> </book>
  newItem.numPages = item?.book?.num_pages ?? 0

  // eslint-disable-next-line camelcase
  // const { title, author_name, user_rating, user_read_at, user_shelves } = item
  //   console.log({ title, author_name, user_rating })
  // eslint-disable-next-line camelcase
  // console.log(`${title} by ${author_name} *:${user_rating} ${user_read_at} sh:${user_shelves}`)
  return newItem
}

function prettyFeed (feed) {
  const { title, lastBuildDate, items } = feed
  console.log(`${title}  count:${items.length} build:${lastBuildDate}`)

  if (!items.length) {
    console.log('No items')
  }
  for (const item of feed.items) {
    const { title, authorName, userRating, userReadAt, userShelves } = item
    console.log(`- ${title} by ${authorName} *:${userRating} ${userReadAt} shelf:${userShelves || 'read'}`)
  }
}

// Start of unit test should write reverse also
// for (const stamp0 of [
//     '1995-12-17T03:24:00.123Z',
//     '2021-03-22T19:31:20.629Z',
//     '2021-03-22T19:31:20.6Z',
//     '2021-03-22T19:31:20.6543Z',
//     '2021-03-22T19:31:20Z'
//   //   '2021-03-22T19:31:20.Z' // invalid date
//   ]) {
//     const date = new Date(stamp0)
//     const stamp1 = dateFileStamp(date)
//     console.log({ stamp1, stamp0 })
//   }

function dateFileStamp (date = new Date()) {
  return date.toISOString().replace(/:/g, '.').replace(/\.\d{1,3}Z$/, 'Z')
}
