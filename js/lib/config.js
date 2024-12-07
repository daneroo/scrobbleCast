// Shared configrations
const os = require('os')
const fs = require('fs')
const { execSync } = require('child_process')

module.exports = {
  hostname: process.env.HOSTALIAS || process.env.HOSTNAME || os.hostname(),
  peers: process.env.PEERS || 'dirac,darwin,d1-px1',
  version: {
    // also exposed as API /version
    pocketscrape: require('../package').version,
    node: process.versions.node,
    platform: `${os.platform()}/${os.arch()}`,
    // Try to get Alpine/Debian/macOS version if available
    distro: (() => {
      try {
        if (os.platform() === 'darwin') {
          const productVersion = execSync('sw_vers -productVersion')
            .toString()
            .trim()
          return `MacOS ${productVersion}`
        }
        if (fs.existsSync('/etc/alpine-release')) {
          return `Alpine ${fs
            .readFileSync('/etc/alpine-release', 'utf8')
            .trim()}`
        }
        if (fs.existsSync('/etc/debian_version')) {
          return `Debian ${fs
            .readFileSync('/etc/debian_version', 'utf8')
            .trim()}`
        }
        return 'unknown'
      } catch (err) {
        return 'unknown'
      }
    })(),
    revision: process.env.GIT_REVISION || 'unknown'
  },
  nats: {
    servers: [process.env.NATSURL || 'nats://nats.ts.imetrical.com:4222']
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
      storage:
        process.env.DB_SQLITE_FILENAME ||
        (process.env.NODE_ENV !== 'test'
          ? 'data/sqlite/scrobblecast.sqlite'
          : 'data/sqlite/scrobblecast-test.sqlite')
    }
  }
}

// used for loggly credentials
function getConfig(path, defaultValue) {
  try {
    // fs.accessSync(path, fs.constants.R_OK)
    return JSON.parse(fs.readFileSync(path).toString())
  } catch (err) {
    console.warn('getConfig', err.message)
    return defaultValue
  }
}
