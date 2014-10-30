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
  this.echo('*** podcasts');
  this.echo(value);
  XSRF = this.getElementAttribute('meta[name="csrf-token"]', 'content');
  this.echo('*** xsrf: ' + XSRF);
});

casper.then(function() {
  var data = this.evaluate(function(XSRF) {
    console.log('cococococococococococococ');
    var $injector = angular.injector(['ng']);
    $injector.invoke(function($http) {
      console.log('inject kikikikiki', XSRF);

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
      }).then(function(result){
        var data = result.data;
        console.log('result',JSON.stringify(data,null,2));
        window.scrobble = data;
      });

    });
  }, XSRF);
});

casper.wait(3000, function() {
  this.echo("I've waited for 3 seconds.");
  this.echo(JSON.stringify(this.getGlobal('scrobble'),null,2));
});
// TODO try error handling to debug this POST
if (0) casper.then(function() {
  // var wsurl = 'https://play.pocketcasts.com/web/podcasts/all.json';
  var wsurl = '/web/podcasts/all.json';
  var data = this.evaluate(function(wsurl) {
    return JSON.parse(__utils__.sendAJAX(wsurl, 'POST', { /*data*/ }, false, {
      // 'Content-Type': 'application/json;charset=UTF-8',
      contentType: 'application/json;charset=UTF-8',
      headers: [{
        name: 'MYKEY',
        value: 'MYVALUE'
      }]
    }));
  }, wsurl);
  this.echo('*** SendAjax: ');
  require('utils').dump(data);
});

// Not working
if (0) casper.thenOpen('https://play.pocketcasts.com/web/podcasts/all.json', {
  method: "post",
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json;charset=UTF-8',
    'Origin': 'https://play.pocketcasts.com',
    'X-XSRF-TOKEN': XSRF
  },
  data: {}
}, function(response) {
  // this.echo("POST request has been sent.")
  this.echo('*** Fetched feeds, response: ');
  // require('utils').dump(response);
  // require('utils').dump(JSON.parse(this.getPageContent()));
  this.echo('*** Content:');
  this.echo(this.getPageContent());
});


casper.run(function() {
  this.echo('Done');
  this.exit();
});