# scrobbleCast

- Codeship:
  - master: [![Codeship Status for daneroo/scrobbleCast](https://app.codeship.com/projects/b7551137-f057-4a12-807a-7a8ae23bddab/status?branch=master)](https://app.codeship.com/projects/434233)
  - develop: [![Codeship Status for daneroo/scrobbleCast](https://app.codeship.com/projects/b7551137-f057-4a12-807a-7a8ae23bddab/status?branch=develop)](https://app.codeship.com/projects/434233)
- Travis:
  - master: [![Build Status](https://travis-ci.org/daneroo/scrobbleCast.svg?branch=master)](https://travis-ci.org/daneroo/scrobbleCast)
  - develop: [![Build Status](https://travis-ci.org/daneroo/scrobbleCast.svg?branch=develop)](https://travis-ci.org/daneroo/scrobbleCast)
- CircleCI:
  - master: [![Build Status](https://circleci.com/gh/daneroo/scrobbleCast.svg?&style=shield)](https://circleci.com/gh/daneroo/scrobbleCast)
  - develop: [![Build Status](https://circleci.com/gh/daneroo/scrobbleCast/tree/develop.svg?style=shield)](https://circleci.com/gh/daneroo/scrobbleCast)

## TODO

- nx (move to typescript)
- ipfs

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
  