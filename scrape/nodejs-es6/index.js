"use strict";

// dependencies - core-public-internal
// var tasks = require('./lib/tasks');


// tasks.deep();
// tasks.shallow();
// tasks.quick();


var _ = require('lodash');
var API = require('./lib/pocketAPI');
var utils = require('./lib/utils');

function show(msg,response){
  response = response.episodes || response.podcasts || response;
  console.log('\n',msg,_.pluck(response.slice(0,4),'title'));
}
function quick(credentials) {
  utils.logStamp('Start scraping (quick)');
  var session;
  return API.sign_in(credentials)
    .then(function(s){
      // grab the session
      session = s;      
    })
    // .then(API.podcasts_all())
    // .then(function(response) {
    //   show('01-podcasts',response);
    // })
    // .then(API.new_releases_episodes())
    // .then(function(response) {
    //   show('03-new_releases',response);
    // })
    // .then(API.in_progress_episodes())
    // .then(function(response) {
    //   show('04-in_progress',response);
    // })
    .then(function(response) {
      utils.logStamp('Done scraping (quick)');
    })
    .catch(function(error){
      console.log('tasks.quick:',error);
      throw error;
    });
}

var credentials = require('./credentials.json');
utils.serialPromiseChainMap(credentials, function(creds) {
  console.log('\n--creds',creds.name,creds['user[email]']);
  return quick(creds);
})
