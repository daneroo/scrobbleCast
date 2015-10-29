import {expect} from 'chai';

import {sayHello} from '../src/thing';

describe('Basic', () => {

  describe('Greeting', () => {

    it('Says Hello', () => {
      const name = 'Dan';
      const expected = 'Hello, Dan';
      const actual = sayHello(name);
      expect(actual).to.equal(expected);
    });

  });

});
