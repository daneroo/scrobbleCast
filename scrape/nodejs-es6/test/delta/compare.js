'use strict';

// why does sublime not read my .jshintrc!!!!
/* globals expect: false */
var delta = require('../../lib/delta');

describe('delta', function() {

  describe('compare', function() {

    var from = {
      uuid: 'a',
      changedfield: 1,
      deletedfield: 1
    };
    var to = {
      uuid: 'a',
      newfield: 1,
      changedfield: 2
    };
    var changes;

    beforeEach(function() {
      changes = delta.compare(from, to);
    });

    it('should return changes (new|chg)', function() {
      expect(changes).not.to.be.null;
      expect(changes).to.deep.equal([{
        op: 'chg',
        key: 'changedfield',
        from: 1,
        to: 2,
      }, {
        op: 'new',
        key: 'newfield',
        to: 1,
      }]);
    });

  });


});
