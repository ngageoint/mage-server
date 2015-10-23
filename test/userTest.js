var expect = require("chai").expect
 , chai = require('chai')
 , user = require('../models/user')
 , sinon = require('sinon')
 , sinonChai = require('sinon-chai');

// Tests the models/User.js model
// BeforeEach: creates stub methods so we don't call the real user methods
// AfterEach: restores original funcitonality to those stubbed methods
// Then tests all exported methods
 describe("User model functions", function(){

   var countStub, getByIdStub;
   beforeEach(function(done){
     // Stub the count method
     countStub = sinon.stub(user, 'count');
     countStub.returns(3)
     // Stub the getUserById method
     getByIdStub = sinon.stub(user, 'getUserById');
     getByIdStub.returns({
       username: "testUser",
       firstname: "test",
       lastname: "User"
     })
     done();
   });

   // Restore functionality to all stubbed methods
   afterEach(function(done){
     countStub.restore();
     getByIdStub.restore();
     done();
   });

   // ----- Begin real tests -----
   // ----- Count()
   it("User.count test", function(done){
     var myCount = user.count(function(err, count){
     });
     expect(user.count).to.have.been.calledOnce;
     expect(myCount).to.equal(3);
     done();
   });

   // ------ getUserById()
   it("User.getUserById test", function(done){
     var id = "id123";
     var myUser = user.getUserById(id, function(err, count){
     });
     expect(user.getUserById).to.have.been.calledOnce;
     expect(myUser.firstname).to.equal("test");
     expect(myUser.username).to.equal("testUser");

     done();
   });


   // ----- Verify funcitons exist
   it("Verify User functions exist", function(done){
     expect(user.createUser).to.be.a('function');
     done();
   });




// *** Transform test
  //  it("transform null test", function(done){
  //    var transformed = transformUser.transform(null, null);
  //    expect(transformed).to.be.null;
  //    done();
  //  });


 });
