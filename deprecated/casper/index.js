// possible runtime options
// --web-security=no 
// Maybe required --cookies-file=mycookies.txt
// --ignore-ssl-errors=true
// Worked --ssl-protocol=tlsv1
// Worked --ssl-protocol=any

credentials = require('credentials.json');
var casper = require('casper').create({
  verbose: true,
  logLevel: "debug",
  pageSettings: {
    loadImages: false
  },
  onError: function(_cspr, r) {
    console.log('onError');
    console.log(JSON.stringify(r));
  },
  onResourceRequested: function(_casper, r) {
    if (/all.json$/.test(r.url)) {
      console.log('onResourceRequested: ' + r.url);
      console.log(JSON.stringify(r, null, 2));
    }
  },
  onResourceReceived: function(_casper, r) {
    if (/all.json$/.test(r.url)) {
      console.log('onResourceReceived: ' + r.url);
      console.log(JSON.stringify(r.headers));
    }
  }
});

// casper.echo("Casper CLI passed args:");
// if (casper.cli.args.length<2){
//   casper.exit();
// }
// require("utils").dump(casper.cli.args);

casper.on('remote.message', function(msg) {
  this.echo('***** REMOTE: ' + msg);
})
casper.start();

casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');

// 'https://play.pocketcasts.com/users/sign_in'
casper.thenOpen('https://play.pocketcasts.com/', function(response) {
  this.echo('*** -URL: ' + this.getCurrentUrl());
  this.echo('*** +URL: ' + response.url);
  // require('utils').dump(response);
  // this.echo(this.getPageContent());
  this.echo('*** title: ' + this.getTitle());
  if ('https://play.pocketcasts.com/users/sign_in' === response.url) {
    this.echo('*** creds: ' + JSON.stringify(credentials));
    this.fill('form[action="/users/sign_in"]', credentials, true);
  } else {
    this.echo('*** Ommitted form submit, url:' + response.url);
  }
});

var XSRF = 'NOTSET';
casper.then(function() {
  this.echo('*** Landed: this.getPageContent() omitted');
  // this.echo(this.getPageContent());
  var value = casper.evaluate(function() {
    return USER_PODCASTS_UUIDS
  });
  // this.echo('*** podcasts');
  // this.echo(value);
  XSRF = this.getElementAttribute('meta[name="csrf-token"]', 'content');
  this.echo('*** xsrf: ' + XSRF);
});

casper.then(function() {
  var data = this.evaluate(function(XSRF) {
    var scrobble = angular.module('scrobble', [])
      .factory('interceptor', function() {
        var requestInterceptor = {
          request: function(config) {
            // here we have the request config
            console.log('interceptor', JSON.stringify(config,null,2));
            return config;
          }
        };
        return requestInterceptor;
      })
      .config(function($httpProvider) {
        console.log('*** CONFIG BLOCK ***');
        $httpProvider.interceptors.push('interceptor');
      })
      .run(function($http) {
        console.log('*** RUN BLOCK ***');

        console.log('injected xsrf ', XSRF);

        // This works
        // $http.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8';
        // $http.defaults.headers.post['X-XSRF-TOKEN'] = XSRF;
        // $http.post('/web/podcasts/all.json', {
        //   data: ''
        // });

        // var url = '/web/podcasts/all.json';
        // var url = '/web/episodes/new_releases_episodes.json';
        var url = '/web/episodes/in_progress_episodes.json';

        $http({
          url: url,
          dataType: 'json',
          method: 'POST',
          data: '',
          headers: {
            "Content-Type": 'application/json;charset=UTF-8',
            'X-XSRF-TOKEN': XSRF
          }
        }).then(function(result) {
          var data = result.data;
          // console.log('result',JSON.stringify(data,null,2));
          window.scrobble = data;
        });

      });

    // angular.bootstrap(document, ['scrobble']);
    // must include ng for $http
    var $injector = angular.injector(['ng','scrobble']);

  }, XSRF);
});

casper.wait(3000, function() {
  this.echo("I've waited for 3 seconds. Should have window.scrobble");
  var scrobble=this.getGlobal('scrobble');
  // this.echo(JSON.stringify(scrobble,null,2));
  this.echo('episodes: '+scrobble.episodes.length);
  this.echo('episode0: '+JSON.stringify(scrobble.episodes[0],null,2));
});

casper.run(function() {
  this.echo('Done');
  this.exit();
});