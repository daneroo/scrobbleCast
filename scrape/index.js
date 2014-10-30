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
  onError: function(_cspr, r) {
    console.log('onError');
    console.log(JSON.stringify(r));
  },
  onResourceReceived: function(_casper, r) {
    console.log('onResourceReceived');
    console.log(JSON.stringify(r));
  },
  onResourceRequested: function(_casper, r) {
    console.log('onResourceRequested');
    console.log(JSON.stringify(r));
  }
});

// casper.echo("Casper CLI passed args:");
// if (casper.cli.args.length<2){
//   casper.exit();
// }
// require("utils").dump(casper.cli.args);

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

// TODO try error handling to debug this POST
casper.then(function() {
  // var wsurl = 'https://play.pocketcasts.com/web/podcasts/all.json';
  var wsurl = '/web/podcasts/all.json';
  var data = this.evaluate(function(wsurl) {
    return JSON.parse(__utils__.sendAJAX(wsurl, 'POST', { /*data*/ }, false, {
      // 'Content-Type': 'application/json;charset=UTF-8',
      contentType:'application/json;charset=UTF-8'
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