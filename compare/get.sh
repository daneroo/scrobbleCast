#!/bin/bash

username='daniel'
hosts='darwin.imetrical.com dirac.imetrical.com euler.imetrical.com'
remote='Code/iMetrical/scrobbleCast/scrape/nodejs-es6/data/history-*.json'
for host in ${hosts}; do
  echo '>>>' doing ${host}
  mkdir -p data/${host}
  # echo rsync -avzq ${username}@${host}:${remote} data/${host}/
  rsync -avzq ${username}@${host}:${remote} data/${host}/
  echo === done  ${host}
done
