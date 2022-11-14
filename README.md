# scrobbleCast

- Github Actions:
  - main: [![Scrape-CI](https://github.com/daneroo/scrobbleCast/actions/workflows/scrape-ci.yml/badge.svg)](https://github.com/daneroo/scrobbleCast/actions/workflows/scrape-ci.yml)
- CircleCI:
  - main: [![CircleCI](https://dl.circleci.com/status-badge/img/gh/daneroo/scrobbleCast/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/daneroo/scrobbleCast/tree/main)

## TODO

- nx (move to typescript)
- ipfs
- Github Actions - only need to get working-directory to work with npm cache
- [microdiff](https://github.com/AsyncBanana/microdiff)

## Overview

- __Idea__: capture and present podcast metadata about *listening events*, as well as *rating* and *categorization*. This can extend to a social network of participants' influence stream.
- __Stretch Goal__: Distributed consensus and processing; sharing influence, directing serendipity.

## Objectives

- Obtain a representation of our listening patterns tastes and habits
- Provide useful recommendations (episode, point in episode) based on those patterns.

To do that we could first:

- Model Podcast Activity (listening, rating, classification)
  - Fetch Podcast feed metadata (time series/events + state)
  - Model for storing retrieved info (time component too)
- (Firebase/P2P) communications for listening recommendations
  - Transform feed input into useful presentation
  - Data-science on our data (n-user correlation)
  - ...

## Action (components and experiments)

- Scrape feed with node.js (ES6?)
- Angular - ionic (Ang-1.2), material- (Ang-1.3), ES6/Ang-2.0
- Minimal frontend - Angular-material (<json.file)
- implement pull from angular (CORS, ionic/phonegap)

## Parts

- nodejs scrape
  - API, promises, rate-limiting, cron
- web app
  - Angular.io (deprecated)
  - React (nextjs)
  