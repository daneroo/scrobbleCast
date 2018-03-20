// Shared configrations
const os = require('os')
const fs = require('fs')

module.exports = {
  hostname: process.env.HOSTNAME || os.hostname(),
  version: { // also exposed as API /version
    pocketscrape: require('../package').version,
    node: process.versions.node
  },
  loggly: getConfig('credentials.loggly.json', null),
  express: {
    port: process.env.PORT || 8000
  },

  // TODO(daneroo): Need a strategy for running tests (NODE_ENV==test)
  sequelize: {
    credentials: {
      database: process.env.DB_DATABASE || 'scrobblecast',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || ''
    },
    settings: {
      host: process.env.DB_HOST || 'localhost',
      dialect: process.env.DB_DIALECT || 'sqlite',
      // port: process.env.DB_PORT || 5432, // or depending on DB_DIALECT,...

      pool: {
        max: 10,
        min: 0,
        idle: 10000
      },
      // Symbol based operators for better security, read more at http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
      operatorsAliases: false,
      // logging: () => {},
      logging: process.env.DB_LOG ? console.log : () => {},
      // SQLite only
      storage: process.env.DB_SQLITE_FILENAME ||
        (process.env.NODE_ENV !== 'test'
          ? 'data/sqlite/scrobblecast.sqlite'
          : 'data/sqlite/scrobblecast-test.sqlite')
    }
  }
}

// used for loggly credentials
function getConfig (path, defaultValue) {
  try {
    // fs.accessSync(path, fs.constants.R_OK)
    return JSON.parse(fs.readFileSync(path).toString())
  } catch (err) {
    console.warn('getConfig', err.message)
    return defaultValue
  }
}
