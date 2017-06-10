
'use strict'
const expect = require('chai').expect

const orm = require('../../../lib/model/orm')
const utils = require('../../../lib/utils')

// const config = require('../../../api/config')

describe('sequelize', function () {
  // this.timeout(20000)
  before(async () => {
    if (process.env.NODE_ENV !== 'test') {
      return Promise.reject(new Error('Tests must be run with NODE_ENV==test to ensure data safety'))
    }
    await orm.sequelize.dropAllSchemas()
    await orm.sequelize.sync({ force: true })
  })

  function makeItem (i) {
    const mod = 16 ** 4 // 4 hex chars
    const hex = Number(mod + i % mod).toString(16).substr(-4)
    return {
      '__type': 'episode',
      '__sourceType': '02-podcasts',
      '__user': 'mock',
      '__stamp': '2017-06-01T00:00:00Z',
      'podcast_uuid': `podcast-${hex}`,
      'id': null,
      'uuid': `episode-${hex}`
      // 'url': 'http://podcast.com/episode.mp3',
      // 'published_at': '2017-05-31 00:00:00',
      // 'duration': '1733',
      // 'file_type': 'audio/mp3',
      // 'title': 'Worldwide condemnation of Kabul bombing',
      // 'size': 13864000,
      // 'playing_status': 0,
      // 'played_up_to': 0,
      // 'is_deleted': 0,
      // 'starred': 0,
      // 'is_video': false
    }
  }

  function create (item) {
    return orm.Item.create({ item: item })
  }

  describe('item', function () {
    it('should create an item', async () => {
      const want = makeItem(0)
      const item = await create(makeItem(0))
      expect(item.item).to.deep.equal(want)
      // check outer keys are inserted properly
      expect(item.digest).to.equal(utils.digest(JSON.stringify(want)))
      expect(item.__user).to.equal(want.__user)
      expect(item.__type).to.equal(want.__type)
      expect(item.uuid).to.equal(want.uuid)
      expect(item.__sourceType).to.equal(want.__sourceType)

      expect(want.__stamp).to.be.a('string')
      expect(item.__stamp).to.be.a('string')
      expect(item.__stamp).to.deep.equal(want.__stamp)
    })
    it('should create another item', async () => {
      const want = makeItem(1)
      const item = await create(makeItem(1))
          // assert stuff
      expect(item).to.not.equal(null)
      expect(item.item).to.deep.equal(want)
    })

    it('should not create an item with duplicate key', async () => {
      const want = makeItem(2)

      const item = await create(makeItem(2))
      expect(item.item).to.deep.equal(want)

      try {
        const item2 = await create(makeItem(2))
        expect('').to.equal('this should not be reached')
        expect(item2.item).to.deep.equal(want)
      } catch (err) {
        expect(err.message).to.equal('Validation error')
      }
    })

    it('should bulk create some items', async () => {
      const items = await orm.Item.bulkCreate([
        {item: makeItem(3)},
        {item: makeItem(4)}
      ])
      expect(items.length).to.equal(2)
      expect(items[0].get('item', {plain: true})).to.deep.equal(makeItem(3))
    })

    it('should find an existing item by digest', async () => {
      const want = makeItem(0)
      const digest = utils.digest(JSON.stringify(want))
      const item = await orm.Item.findOne({
        where: {
          digest: digest
        }
      })
      expect(item.item).to.deep.equal(want)
    })

    it('should find an existing item by id (digest)', async () => {
      const want = makeItem(0)
      const digest = utils.digest(JSON.stringify(want))
      const item = await orm.Item.findById(digest)
      expect(item.item).to.deep.equal(want)
    })

    // depends on previous items - may be brittle
    it('should find many items', async () => {
      const all = await orm.Item.findAll({
        where: {
          '__user': 'mock'
        }
      })
      // expect(all.length > 0).to.equal(true)
      expect(all.length).to.equal(5)
    })

    // depends on previous items - may be brittle
    it('should find many digests', async () => {
      const want = [0, 1, 2, 3, 4].map(i => utils.digest(JSON.stringify(makeItem(i))))
      const digests = await orm.Item.findAll({
        attributes: ['digest'],
        raw: true,
        where: {
          '__user': 'mock'
        },
        order: [['digest', 'DESC']]
      }).map(d => d.digest)

      digests.sort()
      want.sort()

      // expect(all.length > 0).to.equal(true)
      expect(digests.length).to.equal(5)
      expect(digests).to.deep.equal(want)
    })

    it('should delete an item', async() => {
      const toDelete = makeItem(0)
      const digest = utils.digest(JSON.stringify(toDelete))
      const affectedRows = await orm.Item.destroy({
        where: {
          digest: digest
        }
      })
      expect(affectedRows).to.equal(1)
    })
    it('should delete multiple items', async() => {
      const affectedRows = await orm.Item.destroy({
        where: {
          '__user': 'mock'
        }
      })
      expect(affectedRows).to.equal(4)
    })
  })
})
