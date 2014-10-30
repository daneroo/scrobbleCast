// possible runtime options
// --web-security=no 
// Maybe required --cookies-file=mycookies.txt
// --ignore-ssl-errors=true
// Worked --ssl-protocol=tlsv1
// Worked --ssl-protocol=any

credentials = require('credentials.json');
var casper = require('casper').create({
  verbose: true,
  logLevel: "debug"
});

// casper.echo("Casper CLI passed args:");
// if (casper.cli.args.length<2){
//   casper.exit();
// }
// require("utils").dump(casper.cli.args);

casper.start();

casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');

casper.thenOpen('http://play.pocketcasts.com/', function(response) {
  // casper.thenOpen('https://play.pocketcasts.com/users/sign_in', function(response) {
  this.echo('*** -URL: ' + this.getCurrentUrl());
  this.echo('*** +URL: ' + response.url);
  // require('utils').dump(response);
  // this.echo(this.getPageContent());
  this.echo('*** title: ' + this.getTitle());

  if ('https://play.pocketcasts.com/users/sign_in' === response) {
    this.echo('*** creds: ' + JSON.stringify(credentials));
    this.fill('form[action="/users/sign_in"]', credentials, true);
  } else {
    this.echo('*** Ommitted form submit, url:' + response.url);
  }
});

casper.then(function() {
  this.echo('this.getPageContent() omitted');
  // this.echo(this.getPageContent());

});

// require('utils').dump(JSON.parse(this.getPageContent()));


casper.run(function() {
  this.echo('Done');
  this.exit();
});