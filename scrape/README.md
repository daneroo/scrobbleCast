# Scraping

Just to get at some data, and because fortuitously PocketCasts just released a web frontend, which is tantamount to an API, in the angular age! Luckilly they seem to be using angular 1.3 (and bootstrap 3.2), which made the scripting from casperjs (phantomjs scraping wraper), an easy way to start.

We started with casper to mimick the native browser mechanism, but implementation will be easire in node.js once the mechanism is identified.

  cd casper; npm start

This is what we found:

* Authentication: using a simple csrf-token, (fetched from the auth page html meta tag, or in a returnd cookie)
* Then using a simple json post, we can mimick the data feeds the app fetches.

Moving on to implementation the `nodejs-es6` directory contains a first stab at a scraping utility, data/stream/storage models.