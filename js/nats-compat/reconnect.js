'use strict'
// nats-compat #313: long-running publisher that survives a server swap.
// Publishes a digest every second for N seconds, then replays the stream.
const APP = '/usr/src/app'
const config = require(`${APP}/lib/config`)
const nats = require(`${APP}/lib/nats`)
if (config.loggly) throw new Error('loggly credentials loaded - refusing to run')
const SECS = Number(process.argv[2] || 30)
async function main() {
  const nc = await nats.connectToNats()
  ;(async () => { for await (const s of nc.status()) console.log(`STATUS ${new Date().toISOString()} ${s.type} ${JSON.stringify(s.data)}`) })()
  const streamName = 'scrobblecastDigest'
  const subjects = ['im.scrobblecast.scrape.digest', 'im.scrobblecast.scrape.digest.>']
  await nats.findOrCreateStream(streamName, subjects, 86400e9)
  for (let i = 1; i <= SECS; i++) {
    await nats.publish('digest', { generation: i, digest: `r${i}`, scope: 'item', elapsed: 1 })
    await nats.delay(1000)
  }
  const stream = await nats.findOrCreateStream(streamName, subjects, 86400e9)
  let n = 0
  for await (const m of nats.replayMessages(stream, subjects[0], 7200e3)) n++
  console.log(`RESULT server=${nc.info.version} published=${SECS} inStream=${stream.state.messages} replayed=${n}`)
  await nats.disconnectFromNats()
  process.exit(n > 0 && n === stream.state.messages ? 0 : 1)
}
main().catch((err) => { console.error('FAIL', err); process.exit(1) })
