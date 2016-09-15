// Shared configrations
const os = require('os');
const fs = require('fs');

module.exports = {
  // postgres: {
  //   host: process.env.POSTGRES_HOST || 'postgres',
  //   port: 5432,
  //   // doesn't seem to be used?? default database: postgres
  //   db: 'instapool',
  //   table: 'instances',
  //   // match ENV in docker-compose...
  //   user: 'postgres',
  //   password: 'secret'
  // },
  // rethinkdb: {
  //   host: process.env.RETHINKDB_HOST || 'rethinkdb',
  //   // port: 28015,
  //   // authKey: "",
  //   db: 'instapool'
  // },
  hostname: os.hostname(),
  express: {
    port: process.env.PORT || 8000
  },
  loggly: JSON.parse(fs.readFileSync('credentials.loggly.json').toString())

};
