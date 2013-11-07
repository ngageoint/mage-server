var expect = require('expect.js'),
    lib = require('../src/lib');

describe('lib', function() {
    it('rpad', function() {
        expect(lib.rpad('test', 10, ' ')).to.eql('test      ');
    });
    it('lpad', function() {
        expect(lib.lpad('test', 10, ' ')).to.eql('      test');
    });
});
