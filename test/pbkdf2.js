var crypto = require('crypto')
  , pbkdf2 = require('../utilities/pbkdf2.js');

describe("PBKDF2 tests", function() {
  var hasher = new pbkdf2();

  it("should hash password", function(done) {
    hasher.hashPassword("password", function(err, hash) {
      hash.should.be.a('string');
      var items = hash.split('::');
      items.should.have.length(4);
      items[2].should.equal('256');
      items[3].should.equal('12000');

      done(err);
    });
  });

  it("should validate password", function(done) {
    var hash = [
      crypto.randomBytes(128).toString('base64').slice(0, 128),
      crypto.randomBytes(256).toString('base64'),
      256,
      12000,
    ].join("::");

    hasher.validPassword("password", hash, function(err) {
      done(err);
    });
  });

});
