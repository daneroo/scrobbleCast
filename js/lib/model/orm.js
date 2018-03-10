'use strict'

const path = require('path')
const mkdirp = require('mkdirp')
const Sequelize = require('sequelize')
// Implemented my own hooks similar to sequelize-json
// const JsonField = require('sequelize-json')
const config = require('../config')
const utils = require('../utils')
/*
  Add an asset to the asset DB from an assetRequest object
  return {
    init: init,
    sequelize: sequelize,
    Item: Item
  }
 */

module.exports = defineModels()

// This initializion function is synchronous
function defineModels () {
  const creds = config.sequelize.credentials
  const settings = config.sequelize.settings
  var sequelize = new Sequelize(creds.database, creds.username, creds.password, settings)

  const Item = sequelize.define('item', {
    digest: {type: Sequelize.STRING, primaryKey: true, allowNull: false},
    __user: {type: Sequelize.STRING, allowNull: false},
    __type: {type: Sequelize.STRING, allowNull: false},
    uuid: {type: Sequelize.STRING, allowNull: false},
    __sourceType: {type: Sequelize.STRING, allowNull: false},
    __stamp: {type: Sequelize.STRING, allowNull: false},
    item: {
      type: Sequelize.TEXT,
      get: function () {
        var currentValue = this.getDataValue('item')
        if (typeof currentValue === 'string') {
          this.dataValues['item'] = JSON.parse(currentValue)
        }
        return this.dataValues['item']
      },
      // JSON.stringify item and inject outer keys
      set: function (value) {
        // console.log('set item')
        const str = JSON.stringify(value)
        this.setDataValue('item', str)
        // inject outer keys

        // could be conditional if already set...
        // if (!this.dataValues['digest']) { ..set.. }
        this.setDataValue('digest', utils.digest(str))
        this.setDataValue('__user', value.__user)
        this.setDataValue('__type', value.__type)
        this.setDataValue('uuid', value.uuid)
        this.setDataValue('__sourceType', value.__sourceType)
        // expect value.__stamp to be a string
        this.setDataValue('__stamp', value.__stamp)
      }
    }
  }, {
    createdAt: false,
    updatedAt: false,
    hooks: {
      // beforeBulkCreate: instances => instances.forEach(injectKeys),
      // beforeValidate: injectKeys
      // beforeCreate: injectKeys
    },
    indexes: [{
      name: 'items_dedup_load_order',
      fields: ['__user', '__type', 'uuid', '__stamp', '__sourceType', 'digest']
    },
    {
      name: 'items_digest_order',
      fields: ['__stamp', 'digest']
    }
    // {
    //   name: 'old_unique_order',
    //   fields: ['__user', '__type', 'uuid', '__sourceType', '__stamp'] // old unique index order
    // }
    ]
  })

  /// ClassLevel extra finder methods

  Item.findAllByPage = async function (options, itemHandler, pageSize = 10000) {
    const limit = pageSize
    let offset = 0
    while (true) {
      const pagedOptions = {...options, offset, limit}
      // console.log(new Date(), {offset, limit})
      const items = await Item.findAll(pagedOptions)
      for (let item of items) {
        await itemHandler(item)
      }

      if (items.length < limit) {
        break
      } else {
        offset += limit
      }
    }
  }

  const History = sequelize.define('history', {
    // digest: {type: Sequelize.STRING, primaryKey: true, allowNull: false},
    __user: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
    __type: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
    uuid: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
    __firstSeen: {type: Sequelize.STRING, allowNull: false},
    __lastUpdated: {type: Sequelize.STRING, allowNull: false},
    __lastPlayed: {type: Sequelize.STRING, allowNull: true},
    history: {
      type: Sequelize.TEXT,
      get: function () {
        var currentValue = this.getDataValue('history')
        if (typeof currentValue === 'string') {
          this.dataValues['history'] = JSON.parse(currentValue)
        }
        return this.dataValues['history']
      },
      // JSON.stringify item and inject outer keys
      set: function (value) {
        // console.log('set item')
        const str = JSON.stringify(value)
        this.setDataValue('history', str)
        // inject outer keys

        // could be conditional if already set...
        // this.setDataValue('digest', utils.digest(str))
        // console.log('VALUE::meta', value.meta)
        this.setDataValue('__user', value.meta.__user)
        this.setDataValue('__type', value.meta.__type)
        this.setDataValue('uuid', value.uuid)
        this.setDataValue('__firstSeen', value.meta.__firstSeen)
        this.setDataValue('__lastUpdated', value.meta.__lastUpdated)
        this.setDataValue('__lastPlayed', value.meta.__lastPlayed)
      }
    }
  }, {
    createdAt: false,
    updatedAt: false,
    hooks: {
      // beforeBulkCreate: instances => instances.forEach(injectKeys),
      // beforeValidate: injectKeys
      // beforeCreate: injectKeys
    }
    // indexes: [{
    //   unique: true,
    //   // name: 'history_primary',
    //   fields: ['__user', '__type', 'uuid']
    // } ]
  })

  async function init () {
    if (config.sequelize.settings.dialect === 'sqlite') {
      const dir = path.dirname(config.sequelize.settings.storage)
      // log.info('make sure sqlite storage path exists', {dialect: config.sequelize.settings.dialect, storage: config.sequelize.settings.storage, dir: dir})
      mkdirp.sync(dir)
    }
    return sequelize.sync()
  }

  return {
    init,
    sequelize,
    Item,
    History,
    Op: Sequelize.Op
  }
}
