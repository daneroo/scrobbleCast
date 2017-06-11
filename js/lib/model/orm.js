'use strict'

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
      fields: ['__user', '__type', 'uuid', '__sourceType', '__stamp']
    }]
  })

  async function init () {
    return sequelize.sync()
  }
  return {
    init: init,
    sequelize: sequelize,
    Item: Item
  }
}
