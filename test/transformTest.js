var expect = require("chai").expect
 , transformUser = require('../transformers/user.js');

// Tests functions in the Transformers directory
 describe("Transform utilities test", function(){

   // ----- Test Transform User
   it("transformUser null test", function(done){
     var transformed = transformUser.transform(null, null);
     expect(transformed).to.be.null;
     done();
   });
 });
