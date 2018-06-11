#!/bin/sh
set -e


echo "-=-= Watching local clock vs docker clock"
while true; do
  AHEAD=$(expr $(docker run --rm alpine date +%s) - $(date +%s)); 
  echo $(date +%Y-%m-%dT%H:%M:%S) Docker clock is ahead by ${AHEAD} seconds
  sleep 599
done