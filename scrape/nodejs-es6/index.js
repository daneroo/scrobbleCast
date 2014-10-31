
"use strict";

var request = require('request');
request('https://play.pocketcasts.com/', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body) // Print the google web page.
  }
})