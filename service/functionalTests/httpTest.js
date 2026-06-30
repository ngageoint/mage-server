const expect = require("chai").expect
  , axios = require("axios")
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
  before(async function () {
    // Record http requests for testing offline
    if (recordCalls) {
      recorder.before();
    }
    // Make a request for a token before the tests execute
    const signinResponse = await axios.post(conUrl + "/auth/local/signin",
      new URLSearchParams({
        username: testUser.username,
        uid: testUser.uid,
        password: testUser.password
      })
    );
    expect(signinResponse.status).to.equal(200);

    const tokenResponse = await axios.post(conUrl + '/auth/token?createDevice=false',
      new URLSearchParams({ uid: '12345' }),
      { headers: { 'Authorization': 'Bearer ' + signinResponse.data.token } }
    );
    expect(tokenResponse.status).to.equal(200);
    myToken = tokenResponse.data.token;
  });

  // ----- make sure the recorder saves to file
  after(async function () {
    if (recordCalls) {
      recorder.after();
    }
    await axios.post(conUrl + '/api/logout', null, {
      headers: { 'Authorization': 'Bearer ' + myToken }
    });
  });


  // ------------- Tests -----------------
  // Make a request and verify we get a response
  // check the name property
  it("Verify MAGE server is up - return status 200 : /api", async function () {
    const response = await axios.get(conUrl + "/api");
    expect(response.status).to.equal(200);
    expect(response.data.name).to.contain('mage');
  });

  // ----- Should be unauthorized without token
  it("Verify request is denied when token isn't given : /api/users/{id}", async function () {
    try {
      await axios.get(conUrl + "/api/users/" + testUser.userId);
      throw new Error('Expected 401 but request succeeded');
    } catch (err) {
      if (err.response) {
        expect(err.response.status).to.equal(401);
      } else {
        throw err;
      }
    }
  });

  // ------ Get user info
  it("Verify response from /api/users/{id}", async function () {
    const response = await axios.get(conUrl + "/api/users/" + testUser.userId, {
      headers: { 'Authorization': 'Bearer ' + myToken }
    });
    expect(response.status).to.equal(200);
    expect(response.data.username).to.equal(testUser.username);
  });


});
