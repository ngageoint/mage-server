import { expect } from 'chai'

const request = require("request")
  , config = require('../config/httpconfig.json')
  , role = require('../../lib/models/role')
  , user = require('../../lib/models/user')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

describe('bootstrapping', function () {
  const conUrl = config.localServer.location;
  let token: any;
  let testUser: any;

  before(function (done) {

    role.getRole("USER_NO_EDIT_ROLE", function (err: any, role: any) {
      if (err) {
        throw "Error getting user role from database: " + err;
      }

      AuthenticationConfiguration.getConfiguration('local', 'local').then((config: { _id: any; }) => {
        // Create a user
        testUser = {
          displayName: "testUser",
          username: "testUser",
          email: "test@caci.com",
          active: true,
          roleId: role.id,
          authentication: {
            type: "local",
            password: "passwordPassword0987654321",
            authenticationConfigurationId: config._id
          }
        };
        user.createUser(testUser, function (err: any, newUser: any) {
          if (err) return done(err);

          expect(newUser).to.not.be.null;
          expect(newUser._id).to.not.be.null;

          const signinOptions = {
            url: conUrl + "/auth/local/signin",
            method: 'POST',
            form: {
              username: testUser.username,
              password: testUser.authentication.password
            }
          };
          request(signinOptions, function (err: any, response: any, body: any) {
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
            request(tokenOptions, function (err: any, response: any, body: any) {
              if (err) return done(err);

              expect(response.statusCode).to.equal(200);

              const tokenObj = JSON.parse(body);
              token = tokenObj.token;
              done();
            });
          });
        });
      }).catch((err: any) => {
        done(err);
      });
    });
  });

  after(function (done) {
    const logoutOptions = {
      url: conUrl + '/api/logout',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    };
    request(logoutOptions, function (err: any) {
      // get the test user
      user.getUserByUsername(testUser.username, function (err: any, existingUser: any) {
        if (err) return done(err);

        user.deleteUser(existingUser, function (err: any) {
          done(err);
        });
      });
    });
  });

  it('applies authentication middleware to the web controllers', function (done) {
    const options = {
      url: conUrl + "/api/events/",
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    };

    request(options, function (err: any, response: any, body: any) {
      if (err) return done(err);

      expect(response.statusCode).to.equal(200);
      done();
    });
  })
})