var expect = require("chai").expect
 , request = require("request")
 , http = require('http')
 , assert = require('assert')
 , express  = require('express')
 , role = require('../models/role')
 , user = require('../models/user')
 , db = require('./config/dbTestConfig');

// Connect to database and perform testing
  // Before : create a user
  // After : delete a user
  // query a user by name
  // update a user

describe("Direct database tests", function(){

  // ----- Create a test user before the tests begin
  before(function(done){

    // Get the user role
    role.getRole("USER_ROLE",function(err, role){
      if(err){
        throw "Error getting user role from database: " + err;
      }

      // Create a user
      var testUser = {
        "displayName": "testUser",
        "username": "testUser",
        "firstname": "test",
        "lastname": "user",
        "email": "test@caci.com",
        "phones": [],
        "password": "password",
        "active": true,
        "roleId": role.id,
        "avatar": null,
        "icon": null
      }
      user.createUser(testUser, function(err, newUser){
        if(err){
          console.log("Error creating user before tests run: " + err);
        }
        done();
      });
    });
  });


  // ----- Clean up after the tests are done
  after(function(done){
    // get the test user
    user.getUserByUsername("testUser", function(err, existingUser){
      if(err){
        throw "Error getting existing test user for deletion: " + err;
      }
      user.deleteUser(existingUser, function(err, deletedUser){
        if(err){
          throw "Error deleting test user: " + err;
        }
        done();
      });
    });
  });



  //-------------- Begin real tests --------------

  // query a user from the database
  it("Get test user from database, verify first name = test", function(done){
    user.getUserByUsername("testUser",function(err, user){
      expect(user.username).to.equal('testuser');
      done();
    });
  });


  // update a User
  it("Update a test user's information in the database", function(done){
    var updatedEmailAddr = "updatedEmail@caci.com";
    // Get the existing User
    user.getUserByUsername("testUser", function(err, existingUser){
      if(err){
        throw "Error getting existing test user for update: " + err;
      }
      // Update the email address
      existingUser.email = updatedEmailAddr;
      user.updateUser(existingUser, function(err, updatedUser){
        if(err){
          throw "Error updating test user: " + err;
        }
        // Get the user one more time to verify the update worked
        user.getUserByUsername("testUser", function(err, updatedUser){
          if(err){
            throw "Error getting existing test user for update: " + err;
          }
          expect(updatedUser.email).to.equal(updatedEmailAddr);
          done();
        });
      });
    });
  });

});
