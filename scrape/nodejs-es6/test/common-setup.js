
// This file is require'd for all tests
//  A convinient place to setup globals

var chai            = require('chai');
var chaiAsPromised  = require('chai-as-promised');

chai.use(chaiAsPromised);
global.expect = chai.expect;
