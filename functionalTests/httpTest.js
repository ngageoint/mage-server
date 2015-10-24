var expect = require("chai").expect
 , request = require("request")
 , http = require('http')
 , assert = require('assert')
 , express  = require('express')
 , token = require('../models/token')
 , api = require('../api')
 , config = require('./config/httpConfig.json');

// Make some HTTP requests
  // Before: create a token
  // After: Delete the token
  // Verify we can get a response = 200
  // Verify our responses have good values
  // Request a user and verify the data
  // Verify a request without a token is invalid

// Set the connection URL
var localUrl = config.localServer.location;
var httpUrl = config.httpServer.location;
// To switch between localhost and remote host, change conUrl to one of the above.  Configure those values in config/httpConfig.json
var conUrl = localUrl;


// Test multiple calls to the API
describe("MAGE-server API JSON test", function(){

  // Before: get a token
  before(function(done){
    // token.createToken({userId: "561c138232b637fe01e04720"}, function(err, res){
    //   if(err){
    //     throw "Error creating token: " + err;
    //   }
    //   console.log("token: " + res);
    //   done();
    // });
    done();
  });


  // Make a request and verify we get a response
  it("Verify MAGE server is up - return status 200", function(done){
    request(conUrl, function(error, response, body){
      expect(response.statusCode).to.equal(200);
      done();
    });
  });

  // Use the base URL to get a JSON string, check the name property
  it("Verify response from /api (verify name=MAGE)", function(done){
    request(conUrl, function(error, response, body){
      var jsonObj = JSON.parse(body);
      var appName = jsonObj['name'].substring(0,4);
      expect(appName).to.equal('MAGE');
      //console.log("Mage response***" + jsonObj['disclaimer'].text);
      done();
    });
  });

  // request some user data

  // Should be unauthorized without token


});




// Another way to make HTTP requests
  //it("Verify JSON data is correct", function(done){
  //  http.get('http://localhost:4242/api', function (res) {
  //    assert.equal(200, res.statusCode);
  //    done();
  //  });
  //});
