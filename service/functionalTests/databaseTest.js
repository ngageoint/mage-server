"use strict";

const expect = require("chai").expect
  , role = require('../lib/models/role')
  , user = require('../lib/models/user')
  , AuthenticationConfiguration = require('../lib/models/authenticationconfiguration');

// Connect to database and perform testing
// Before : create a user
// After : delete a user
// query a user by name
// update a user

describe("Direct database tests", function () {

  // ----- Create a test user before the tests begin
  before(function (done) {

    // Get the user role
    role.getRole("USER_ROLE", function (err, role) {
      if (err) {
        throw "Error getting user role from database: " + err;
      }

      AuthenticationConfiguration.getConfiguration('local', 'local').then(config => {
        // Create a user
        const testUser = {
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
        user.createUser(testUser, function (err, newUser) {
          if (err) return done(err);

          expect(newUser).to.not.be.null;
          expect(newUser._id).to.not.be.null;
          done();
        });
      }).catch(err => {
        done(err);
      });
    });
  });


  // ----- Clean up after the tests are done
  after(function (done) {
    // get the test user
    user.getUserByUsername("testUser", function (err, existingUser) {
      if (err) return done(err);

      user.deleteUser(existingUser, function (err) {
        done(err);
      });
    });
  });



  //-------------- Begin real tests --------------

  // query a user from the database
  it("Get test user from database, verify first name = test", function (done) {
    user.getUserByUsername("testUser", function (err, existingUser) {
      expect(existingUser.displayName).to.equal('testUser');
      done(err);
    });
  });


  // update a User
  it("Update a test user's information in the database", function (done) {
    const updatedEmailAddr = "updatedEmail@caci.com";
    // Get the existing User
    user.getUserByUsername("testUser", function (err, existingUser) {
      if (err) return done(err);

      // Update the email address
      existingUser.email = updatedEmailAddr;
      user.updateUser(existingUser, function (err) {
        if (err) return done(err);

        // Get the user one more time to verify the update worked
        user.getUserByUsername("testUser", function (err, updatedUser) {
          if (err) return done(err);
          expect(updatedUser.email).to.equal(updatedEmailAddr);
          done();
        });
      });
    });
  });

});
