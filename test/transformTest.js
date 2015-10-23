var expect = require("chai").expect
 , transformObservation = require('../transformers/observation.js')
 , transformUser = require('../transformers/user.js');

// Tests functions in the Transformers directory
  // Transform user given null argument
  // Transform observation not null argument
 describe("Transform utilities test", function(){

   // ----- Test Transform User
   it("transformUser null test", function(done){
     var transformed = transformUser.transform(null, null);
     expect(transformed).to.be.null;
     done();
   });

   it("transformObservation null test", function(done){
     var transformed = transformObservation.transform(null, null);
     expect(transformed).to.be.null;
     done();
   });
 });
