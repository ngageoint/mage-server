const expect = require("chai").expect
  , request = require("request")
  , record = require('./record')
  , config = require('./config/httpconfig.json');

// --------- Make some HTTP requests
// Before: create a token.  Optional - record http responses
// After: Recorder cleanup
// Verify we can get a response = 200
// Verify our responses have good values
// Verify a request without a token is invalid
// Request a user and verify the data


// Set the connection URL
const functionalServer = config.localServer.location;
// To switch between localhost and remote host, change conUrl to one of the above.  Configure those values in config/httpconfig.js
const conUrl = functionalServer;
// Set recordCalls to true if you want to save off all http requests for
// offline testing.  See record.js for details
const recordCalls = false;
// get the test user from the config file
const testUser = config.httpTestUser;

describe("MAGE-server API JSON test", function () {
  let recorder;
  // a recorder to save the http request data for offline playback
  if (recordCalls) {
    recorder = record('mage_recording');
  }
  // Need to store a token for future requests
  let myToken = "";

  // ----- Before: get a token
  before(function (done) {
    // Record http requests for testing offline
    if (recordCalls) {
      recorder.before();
    }
    // Make a request for a token before the tests execute
    const signinOptions = {
      url: conUrl + "/auth/local/signin",
      method: 'POST',
      form: {
        'username': testUser.username,
        'uid': testUser.uid,
        'password': testUser.password
      }
    };
    request(signinOptions, function (err, response, body) {
      if (err) return done(err);

      expect(response.statusCode).to.equal(200);

      const signinToken = JSON.parse(body);
      const tokenOptions = {
        url: conUrl + '/auth/token?createDevice=false',
        method: 'POST',
        form: {
          uid: '12345'
        },
        headers: { 'Authorization': 'Bearer ' + signinToken.token }
      }
      request(tokenOptions, function (err, response, body) {
        if (err) return done(err);

        expect(response.statusCode).to.equal(200);

        const tokenObj = JSON.parse(body);
        myToken = tokenObj.token;
        done();
      });
    });
  });

  // ----- make sure the recorder saves to file
  after(function (done) {
    if (recordCalls) {
      recorder.after();
    }
    const logoutOptions = {
      url: conUrl + '/api/logout',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + myToken }
    };
    request(logoutOptions, function (err) {
      done(err);
    });
  });


  // ------------- Tests -----------------
  // Make a request and verify we get a response
  // check the name property
  it("Verify MAGE server is up - return status 200 : /api", function (done) {
    request(conUrl + "/api", function (err, response, body) {
      if (err) {
        console.log(err);
        return done(err);
      }

      expect(response.statusCode).to.equal(200);
      const jsonObj = JSON.parse(body);
      expect(jsonObj.name).to.contain('mage');
      done();
    });
  });

  // ----- Should be unauthorized without token
  it("Verify request is denied when token isn't given : /api/users/{id}", function (done) {
    const tokenOptions = {
      url: conUrl + "/api/users/" + testUser.userId,
      method: 'GET'
    };
    request(tokenOptions, function (err, response) {
      if (err) {
        console.log(err);
        return done(err);
      }

      expect(response.statusCode).to.equal(401);
      done(err);
    });
  });

  // ------ Get user info
  it("Verify response from /api/users/{id}", function (done) {

    const tokenOptions = {
      url: conUrl + "/api/users/" + testUser.userId,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + myToken }
    };

    request(tokenOptions, function (err, response, body) {
      if (err) {
        console.log(err);
        return done(err);
      }

      expect(response.statusCode).to.equal(200);
      const jsonObj = JSON.parse(body);
      const username = jsonObj.username;
      expect(username).to.equal(testUser.username);
      done(err);
    });
  });


});
