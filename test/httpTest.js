var expect = require("chai").expect
 , userApp = require('../routes/users')
 , supertest = require('supertest')
 , nock = require('nock')
 , http = require('http')
 , recordings = require('../functionalTests/testRecordings.js');

// ------------- Test recorded http requests from last functional tests
// Before
// After - cleanAll removes the mounted nock http requests
// api - make sure we get the default mage data

describe("HTTP request unit tests", function(){

  before(function(done){
    done();
  });

  after(function(done){
    nock.cleanAll();
    done();
  });

  it('Call to /api', function(done){
    http.get("http://localhost:4242/api", function(resp) {
      var str = "";
      resp.on("data", function(data) { str += data; });
      resp.on("end", function() {
        console.log("Got Result: ", str);
        done();
      });
    });
  });



});
