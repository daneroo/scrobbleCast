

export HOSTNAME=$(shell hostname)

all:
	@echo "Make all the things: build, start, logs, snapshot, restore"

build:
	docker-compose build --pull

start:
	docker-compose up -d

logs:
	docker-compose logs -f scrape

snapshot:
	@echo "Taking a snapshot DB -> data/snapshots -> s3"
	@echo "  ..optionally, to avoid pushing other hosts 'current':"
	@echo "You could:"
	@echo "  sudo rm -rf data/snapshots/current/"
	docker-compose run --rm scrape node snapshots.js
	docker-compose run --rm scrape npm run snapshot

restore:
	@echo "Restoring from s3 -> data/snapshots -> DB"
	@echo "Optionally, you could:"
	@echo "  sudo rm -rf data/"
	docker-compose run --rm scrape npm run restore
	docker-compose run --rm scrape node restore.js

sync:
	@echo "Synching peer -> DB"
	docker-compose run --rm scrape node sync.js http://euler.imetrical.com:8000/api
	docker-compose run --rm scrape node sync.js http://newton.imetrical.com:8000/api
	docker-compose run --rm scrape node sync.js http://darwin.imetrical.com:8000/api
