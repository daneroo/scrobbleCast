// This file is require'd for all tests

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
// no globals, use:
//   const expect = require('chai').expect
// global.expect = chai.expect
