'use strict';

// why does sublime not read my .jshintrc!!!!
/* globals expect: false */
var delta = require('../../lib/delta');

describe('delta', function() {

  describe('normalize', function() {

    it('should cast certain boolean fields', function() {
      var n = delta.normalize({
        uuid: 'a',
        othernullable: null,
        is_deleted: null,
        starred: 0,
        is_video: null
      });
      expect(n).to.deep.equal({
        uuid: 'a',
        othernullable: null,
        is_deleted: false,
        starred: false,
        is_video: false
      });
    });

    it('should remove certain nullable fields', function() {
      var n = delta.normalize({
        uuid: 'a',
        othernullable: null,
        duration: null,
        played_up_to: null,
        playing_status: null
      });
      expect(n).to.deep.equal({
        uuid: 'a',
        othernullable: null
      });
    });

  });

  it('should be awesome', function() {
    var thing = 'awesome';
    expect(thing).to.equal('awesome');
  });

});
