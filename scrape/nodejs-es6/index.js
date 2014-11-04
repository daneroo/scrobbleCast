"use strict";

// dependencies
var API = require('./lib/pocketAPI');

// globals
// external data for creds.
var credentials = require('./credentials.json');

API.sign_in(credentials)
  .then(API.new_releases_episodes())
  .then(API.in_progress_episodes())
  .then(API.podcasts_all())
  .then(API.find_by_podcast({
    uuid: "80931490-01be-0132-a0fb-5f4c86fd3263", // adventures in angluar
    page: 1
  }))
  .then(API.find_by_podcast({
    uuid: "e4b6efd0-0424-012e-f9a0-00163e1b201c", // History of Rome
    page: 16
  }))
  .catch(function(error) {
    console.log('+++catch+++ ERROR', error);
  });