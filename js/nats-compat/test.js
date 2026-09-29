'use strict'
// nats-compat #313: exercise scrobblecast's lib/nats.js paths against $NATSURL
// run with cwd=/test so credentials.loggly.json is NOT found (no real Loggly traffic)
const APP = '/usr/src/app'
const config = require(`${APP}/lib/config`)
const nats = require(`${APP}/lib/nats`)
const { getCheckpointRecordsNats } = require(`${APP}/lib/logcheck`)
const { connect, JSONCodec, headers } = require(`${APP}/node_modules/nats`)

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`)
}
function within(ms, p) {
  return Promise.race([p, nats.delay(ms).then(() => { throw new Error(`step timeout ${ms}ms`) })])
}
async function step(name, fn, ms = 15000) {
  try { await within(ms, fn()) } catch (err) { check(name, false, `threw: ${err.message}`); console.error(err) }
}

async function main() {
  if (config.loggly) throw new Error('loggly credentials loaded - refusing to run')
  const mode = process.argv[2] || 'all' // all | seed | replay
  const jc = JSONCodec()
  const nc = await nats.connectToNats()
  check('connect', !!nc, nc && `server=${nc.info.version} proto=${nc.info.proto} js=${nc.info.jetstream} client=${nc.options.name}`)
  if (!nc) return

  // observer on a separate raw connection
  const obs = await connect({ servers: config.nats.servers, name: 'nats313.observer' })
  const seen = []
  const osub = obs.subscribe('im.scrobblecast.scrape.>')
  ;(async () => { for await (const m of osub) seen.push(m.subject) })()
  await obs.flush()

  const streamName = 'scrobblecastDigest'
  const subjects = ['im.scrobblecast.scrape.digest', 'im.scrobblecast.scrape.digest.>']
  const maxAge = 86400e9

  if (mode !== 'replay') {
    await step('findOrCreateStream (create or find)', async () => {
      const s = await nats.findOrCreateStream(streamName, subjects, maxAge)
      check('findOrCreateStream (create or find)', !!s && s.config.name === streamName,
        `subjects=${JSON.stringify(s && s.config.subjects)} max_age=${s && s.config.max_age}`)
    })
    await step('plain publishes', async () => {
      // same calls as lib/cron.js, lib/tasks.js, lib/sync.js
      for (let i = 0; i < 3; i++) {
        await nats.publish('digest', { generation: i, digest: `d${i}`, scope: 'item', elapsed: 1 })
        await nats.publish('digest', { generation: i, digest: `h${i}`, scope: 'history', elapsed: 1 })
      }
      await nats.publish('task', { state: 'start', task: 'nats313' })
      await nats.publish('progress', { step: 1 })
      await nats.publish('sync.count', { count: 1 })
      await nats.publish('sync.trace', { uri: 'x', stamp: 's', title: 't' })
      await nats.publish('sync.error', { uri: 'x', error: 'e' })
      await nc.flush(); await obs.flush(); await nats.delay(300)
      const want = ['digest', 'task', 'progress', 'sync.count', 'sync.trace', 'sync.error'].map((s) => `im.scrobblecast.scrape.${s}`)
      const missing = want.filter((s) => !seen.includes(s))
      check('plain publishes', missing.length === 0 && seen.length === 11, `received=${seen.length}/11 missing=${JSON.stringify(missing)}`)
    })
  }

  let stream
  await step('findOrCreateStream (find existing)', async () => {
    stream = await nats.findOrCreateStream(streamName, subjects, maxAge)
    check('findOrCreateStream (find existing)', !!stream && stream.state.messages >= 6, `messages=${stream && stream.state.messages}`)
  })

  await step('replayMessages (ordered, ackNone, startAtTimeDelta 2h)', async () => {
    let n = 0; let last
    for await (const m of nats.replayMessages(stream, subjects[0], 7200e3)) { n++; last = m.info.pending; jc.decode(m.data) }
    check('replayMessages (ordered, ackNone, startAtTimeDelta 2h)', n === stream.state.messages && last === 0, `got=${n} expected=${stream.state.messages} lastPending=${last}`)
  })

  await step('logcheck.getCheckpointRecordsNats', async () => {
    const recs = await getCheckpointRecordsNats('item')
    check('logcheck.getCheckpointRecordsNats', recs.length > 0 && recs.every((r) => r.host && r.digest && r.stamp), `item records=${recs.length}`)
  })

  await step('ephemeral consumers cleaned up', async () => {
    await nats.delay(500)
    const jsm = await nc.jetstreamManager()
    const info = await jsm.streams.info(streamName)
    check('ephemeral consumers cleaned up', info.state.consumer_count === 0, `consumer_count=${info.state.consumer_count}`)
  })

  if (mode !== 'replay') {
    await step('request/reply scatter (discovery)', async () => {
      // responder mimics discovery-client.js (reply with headers), on its own connection
      const subject = 'im.scrobblecast.scrape.discovery'
      const r = await connect({ servers: config.nats.servers, name: 'nats313.responder' })
      const rs = r.subscribe(subject)
      ;(async () => {
        for await (const m of rs) { const h = headers(); h.append('peerId', 'p1'); m.respond(jc.encode({ peerId: 'p1' }), { headers: h }) }
      })()
      await r.flush()
      const peers = await nats.scatter(subject)
      await r.close()
      const none = await nats.scatter(subject)
      check('request/reply scatter (discovery)', peers.length === 1 && peers[0].peerId === 'p1' && none.length === 0, `peers=${JSON.stringify(peers)} withNoResponder=${none.length}`)
    })
  }

  await obs.close()
  await nats.disconnectFromNats()
}

main()
  .catch((err) => { check('main', false, err.message); console.error(err) })
  .finally(() => {
    const failed = results.filter((r) => !r.ok).length
    console.log(`SUMMARY ${failed === 0 ? 'PASS' : 'FAIL'} ${results.length - failed}/${results.length} (node ${process.version})`)
    process.exit(failed ? 1 : 0)
  })
