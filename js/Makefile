

export HOSTALIAS=$(shell hostname -s)

all:
	@echo "Make all the things: build, start, logs, snapshot, restore"

build:
	docker compose build --pull

start:
	docker compose up -d

stop:
	docker compose stop

logs:
	docker compose logs -f scrape

nats:
	nats -s nats.ts.imetrical.com sub -r im.scrobblecast.\>

nats-top:
	nats-top -s nats.ts.imetrical.com

natsboard:
	npx natsboard --nats-mon-url http://nats.ts.imetrical.com:8222

sync:
	@echo "Synching peer -> DB  (can take a since date as 2nd param)"
	docker compose run --rm scrape node sync.js http://darwin.imetrical.com:8000/api
	docker compose run --rm scrape node sync.js http://d1-px1.imetrical.com:8000/api

check:
	for h in darwin dirac d1-px1; do echo $$h `curl -s http://$$h.imetrical.com:8000/api/version`; done
	for h in darwin dirac d1-px1; do echo $$h `curl -s http://$$h.imetrical.com:8000/api/status`; done
	for h in darwin dirac d1-px1; do echo $$h `curl -s http://$$h.imetrical.com:8000/api/digests|shasum -a 256`; done

snapshot:
	@echo "Taking a snapshot DB -> data/snapshots -> s3"
	@echo "  ..optionally, to avoid pushing other hosts 'current':"
	@echo "You could:"
	@echo "  sudo rm -rf data/snapshots/current/"
	docker compose run --rm scrape node snapshots.js
	# aws s3 sync, but from inside the amazon/aws-cli container
	npm run snapshot

restore:
	@echo "Restoring from s3 -> data/snapshots -> DB"
	@echo "Optionally, you could:"
	@echo "  sudo rm -rf data/"
	docker compose run --rm scrape npm run restore
	# aws s3 sync, but not from inside the container
	npm run restore

archive:
	@echo "Archiving data/snapshots for /archive"
	@echo tar cjvf scrobbleCast-data-snapshots-`date -u +%Y%m%d.%H%MZ`.tar.bz2 data/snapshots/monthly/
	@echo "mv scrobbleCast-data-snapshots-... /Volumes/Space/archive/mirror/scrobbleCast/"