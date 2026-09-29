#!/usr/bin/env bash
# usage: nats-compat/run.sh <server-image> [platform] [storeDir] [mode]
# Starts a NATS server with the gateway's nats-server.conf, runs test.js inside scrobblecast:nats313.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
IMG=$1; PLAT=${2:-}; STORE=${3:-$(mktemp -d)}; MODE=${4:-all}
NET=nats313; SRV=nats313-server
docker network inspect $NET >/dev/null 2>&1 || docker network create $NET >/dev/null
docker rm -f $SRV >/dev/null 2>&1
docker run -d --name $SRV --network $NET ${PLAT:+--platform $PLAT} \
  -v "$HERE/nats-server.conf:/etc/nats313.conf:ro" -v "$STORE:/data/jetstream" \
  "$IMG" -c /etc/nats313.conf >/dev/null
for i in $(seq 1 30); do docker logs $SRV 2>&1 | grep -q "Server is ready" && break; sleep 1; done
docker logs $SRV 2>&1 | grep -E "Version:|Starting nats-server|Server is ready" | head -3
docker run --rm --network $NET -w /test -v "$HERE/test.js:/test/test.js:ro" \
  -e NATSURL=nats://$SRV:4222 -e HOSTALIAS=nats313-test scrobblecast:nats313 node /test/test.js "$MODE"
RC=$?
echo "--- server warnings/errors:"; docker logs $SRV 2>&1 | grep -E "\[(WRN|ERR)\]" | head -20
docker rm -f $SRV >/dev/null
exit $RC
