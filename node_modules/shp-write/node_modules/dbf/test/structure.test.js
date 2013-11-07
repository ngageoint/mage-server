var expect = require('expect.js'),
    structure = require('../src/structure');

describe('structure', function() {
    it('creates a blank record', function() {
        var dat = structure([{ foo: 'bar' }]);
        expect(dat).to.be.ok();
    });
});
