var expect = require("chai").expect
 , transformUser = require('../transformers/user.js');

describe("Transformer tests", function() {

  it("should transform null to null", function(done){
    var transformed = transformUser.transform(null, null);
    expect(transformed).to.be.null;
    done();
  });

});
