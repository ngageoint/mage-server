var expect = require("chai").expect
 , chai = require('chai')
 , user = require('../models/user')
 , sinon = require('sinon')
 , sinonChai = require('sinon-chai')
 , userApp = require('../routes/users')
 , request = require('supertest');

// Tests the models/User.js model
// Before: set up supertest to listen for requests
// BeforeEach: creates stub methods so we don't call the real user methods
// AfterEach: restores original funcitonality to those stubbed methods
// Then tests all exported methods
 describe("User model functions", function(){

   before(function(done){

     done();
   });

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

   // ----- Test app calls
   it("Test http request: /api/users/count ", function(done){
    //  var user1 = request.agent();
    //  user1.post('http://localhost:4000')
    //  request(userApp)
    //   .get('/api/users/count')
    //   .auth('jclark', '')
    //   .expect(200, done);
    done();
   });

});
