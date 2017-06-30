
// This file is require'd for all tests

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
// no globals, use:
//   const expect = require('chai').expect
// global.expect = chai.expect
