#!/usr/bin/env bash
# usage: nats-compat/reconnect.sh
# Swap the server pinned -> 2.15.0 (same name, same store) under a running publisher.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
NET=nats313; SRV=nats313-server; STORE=$(mktemp -d)
docker network inspect $NET >/dev/null 2>&1 || docker network create $NET >/dev/null
start() { docker run -d --name $SRV --network $NET ${2:+--platform $2} \
  -v "$HERE/nats-server.conf:/etc/nats313.conf:ro" -v "$STORE:/data/jetstream" "$1" -c /etc/nats313.conf >/dev/null
  for i in $(seq 1 30); do docker logs $SRV 2>&1 | grep -q "Server is ready" && break; sleep 1; done
  docker logs $SRV 2>&1 | grep "Version:"; }
docker rm -f $SRV >/dev/null 2>&1
start synadia/nats-server:nightly-20220224 linux/amd64
docker run --rm --name nats313-client --network $NET -w /test -v "$HERE/reconnect.js:/test/reconnect.js:ro" \
  -e NATSURL=nats://$SRV:4222 -e HOSTALIAS=nats313-test scrobblecast:nats313 node /test/reconnect.js 30 &
CLIENT=$!
sleep 10; echo "=== $(date -u +%FT%TZ) swapping server"; docker rm -f $SRV >/dev/null; sleep 3
start nats:2.15.0
wait $CLIENT; RC=$?
docker rm -f $SRV >/dev/null; rm -rf "$STORE"
exit $RC
