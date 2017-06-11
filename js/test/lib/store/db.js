'use strict'
const expect = require('chai').expect

const orm = require('../../../lib/model/orm')
const db = require('../../../lib/store/db')
const helpers = require('../../helpers')

// const config = require('../../../api/config')

describe('store', function () {
  // this.timeout(20000)
  before(async () => {
    if (process.env.NODE_ENV !== 'test') {
      return Promise.reject(new Error('Tests must be run with NODE_ENV==test to ensure data safety'))
    }
    await orm.sequelize.dropAllSchemas()
    await orm.sequelize.sync({ force: true })
  })

  describe('db', function () {
    it.skip('should initialise (open connections) the store', async () => {
    })
    it.skip('should end (close connections) the store', async () => {
    })
    it('should save an item', async () => {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })
    it('should save an item without error if it already exists', async () => {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })

    // how about mocks...
    it.skip('should saveByBatch...', async () => {})
    it.skip('should saveAll...', async () => {})
    it.skip('should load...', async () => {})
    it.skip('should getByDigest...', async () => {})
    it.skip('should digests...', async () => {})
    it.skip('should getByKey...', async () => {})
    it.skip('should remove...', async () => {})
    it.skip('should saveByBatch...', async () => {})

    describe('private', function () {
      it('should calculate the _digest of an item', async () => {
        const item = helpers.makeItem(0)
        const want = 'e026c69fd19bc05deae620ac32b85dbe70bdddd81fd5b34fe732212ed169ce2e'
        const got = db._digest(item)
        expect(got).to.equal(want)
      })
      it('should verify an item _exists', async () => {
        const item = helpers.makeItem(0)
        await orm.Item.create({ item: item })

        const exists = await db._exists(item)
        expect(exists).to.equal(true)
      })

      it('should detect a digest duplicate error: _isErrorDuplicateDigest', async () => {
        const item = helpers.makeItem(0)
        try {
          await orm.Item.create({ item: item })
        } catch (error) {
          const detect = db._isErrorDuplicateDigest(error)
          expect(detect).to.equal(true)
        }
      })
      it('should ignore a non digest duplicate error: _isErrorDuplicateDigest', async () => {
        const error = new Error('Some other error')
        const detect = db._isErrorDuplicateDigest(error)
        expect(detect).to.equal(false)
      })
    })
  })
})
