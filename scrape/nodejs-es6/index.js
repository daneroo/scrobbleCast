"use strict";

var request = require('request');
var jar = request.jar()

//this how we could set a global default ?
// request = request.defaults({
//   jar: jar
// })

var uri = 'https://play.pocketcasts.com/';
request({
  jar: jar,
  uri: uri
}, function(error, response, body) {
  if (!error && response.statusCode == 200) {
    //  why is headers in in the keys?
    // console.log('response.keys:', Object.keys(response.headers));

    // console.log('headers:',response.headers);
    // console.log('headers:', response.headers['set-cookie']);

    // console.log('jar:', jar);
    var cookies = jar.getCookies(uri);
    // console.log('jar.cookies:', cookies);

    var XSRF;
    cookies.forEach(function(cookie){
      // console.log('jar.eachCookie:', cookie);      
      // console.log('aCookey.key:', cookie.key);
      // console.log('aCookey.value:', cookie.value);
      if ("XSRF-TOKEN"===cookie.key){
        // console.log('XSRF-TOKEN:', cookie.value);
        XSRF=cookie.value;
      }

    });

    console.log('XSRF:', XSRF);


    // console.log(body);
  }
})