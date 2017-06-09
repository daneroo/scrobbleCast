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
