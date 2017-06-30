// Shared configrations
const os = require('os')
const fs = require('fs')

module.exports = {
  hostname: process.env.HOSTNAME || os.hostname(),
  // TODO(daneroo) root directory relative...?
  loggly: JSON.parse(fs.readFileSync('credentials.loggly.json').toString()),
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
      //  dialect: 'mysql'|'sqlite'|'postgres'|'mssql',

      pool: {
        max: 10,
        min: 0,
        idle: 10000
      },
      // logging: () => {},
      logging: process.env.DB_LOG ? console.log : () => {},
      // SQLite only
      storage: process.env.DB_SQLITE_FILENAME ||
        (process.env.NODE_ENV !== 'test'
          ? 'data/sqlite/scrobblecast.sqlite'
          : 'data/sqlite/scrobblecast-test.sqlite')
    }
  },

  // Will be depcrated
  postgres: {
    // set table/table prefix...?
    host: process.env.POSTGRES_HOST || 'localhost',
    port: 5432,
    // match ENV in docker-compose...
    database: 'scrobblecast',
    user: 'postgres'
    // password: null
  }
}
