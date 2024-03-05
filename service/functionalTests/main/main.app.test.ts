import { expect } from 'chai'

const request = require("request")
  , config = require('../config/httpconfig.json')
  , role = require('../../lib/models/role')
  , user = require('../../lib/models/user')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

xdescribe('bootstrapping', function () {
  const conUrl = config.localServer.location;
  const noEditRolesUser = {
    _id: null,
    displayName: "noEditRolesTestUser",
    username: "noEditRolesTestUser",
    email: "noEditRolesTestUser@caci.com",
    active: true,
    enabled: true,
    roleId: null,
    authentication: {
      type: "local",
      password: "passwordPassword0987654321",
      authenticationConfigurationId: null
    },
    token: null,
    device: '11111'
  };
  const adminUser = {
    _id: null,
    displayName: "adminTestUser",
    username: "adminTestUser",
    email: "adminTestUser@caci.com",
    active: true,
    enabled: true,
    roleId: null,
    authentication: {
      type: "local",
      password: "passwordPassword0987654321",
      authenticationConfigurationId: null
    },
    token: null,
    device: '22222'
  };

  before(function (done) {
    AuthenticationConfiguration.getConfiguration('local', 'local').then((config: { _id: any; }) => {
      noEditRolesUser.authentication.authenticationConfigurationId = config._id;
      adminUser.authentication.authenticationConfigurationId = config._id;

      createUser(noEditRolesUser, 'USER_NO_EDIT_ROLE', function (err: any) {
        if (err) return done(err);

        createUser(adminUser, 'ADMIN_ROLE', function (err2: any) {
          if (err2) return done(err);
          done();
        });
      });
    }).catch((err: any) => {
      done(err);
    });
  });

  function createUser(userToCreate: any, userRole: string, done: any): void {
    role.getRole(userRole, function (err: any, role: any) {
      if (err) return done(err);

      userToCreate.roleId = role.id;

      user.createUser(userToCreate, function (err: any, newUser: any) {
        if (err) return done(err);

        expect(newUser).to.not.be.null;
        expect(newUser._id).to.not.be.null;

        userToCreate._id = newUser._id;

        signin(userToCreate, done);
      });
    });
  }

  function signin(userToSignin: any, done: any): void {
    const signinOptions = {
      url: conUrl + "/auth/local/signin",
      method: 'POST',
      form: {
        username: userToSignin.username,
        password: userToSignin.authentication.password
      }
    };
    request(signinOptions, function (err: any, response: any, body: any) {
      if (err) return done(err);

      expect(response.statusCode).to.equal(200);

      const signinToken = JSON.parse(body);

      const tokenOptions = {
        url: conUrl + '/auth/token',
        method: 'POST',
        form: {
          uid: userToSignin.device,
          user: userToSignin
        },
        headers: { 'Authorization': 'Bearer ' + signinToken.token }
      }
      request(tokenOptions, function (err: any, response: any, body: any) {
        if (err) return done(err);

        expect(response.statusCode).to.equal(200);

        const tokenObj = JSON.parse(body);
        userToSignin.token = tokenObj.token;
        done();
      });
    });
  }

  after(function (done) {
    logout(noEditRolesUser, function (err: any) {
      logout(adminUser, function (err2: any) {
        done();
      });
    });
  })

  function logout(userToLogout: any, done: any): void {
    const logoutOptions = {
      url: conUrl + '/api/logout',
      method: 'POST',
      user: {
        _id: userToLogout._id
      },
      token: userToLogout.token,
      headers: { 'Authorization': 'Bearer ' + userToLogout.token }
    };
    request(logoutOptions, function (err: any) {
      user.getUserByUsername(userToLogout.username, function (err: any, existingUser: any) {
        if (err) return done(err);

        user.deleteUser(existingUser, function (err: any) {
          done(err);
        });
      });
    });
  }

  it('applies authentication middleware to the web controllers', function (done) {
    const getEventsOptions = {
      url: conUrl + "/api/events/",
      method: 'GET',
      user: adminUser,
      headers: { 'Authorization': 'Bearer ' + adminUser.token }
    };

    request(getEventsOptions, function (err: any, response: any, body: any) {
      if (err) return done(err);

      expect(response.statusCode).to.equal(200);

      const events = JSON.parse(body);
      expect(Array.isArray(events)).to.be.true;
      expect(events.length).is.greaterThan(0);

      const event = events[0];
      const updateEventOptions = {
        url: conUrl + "/api/events/" + event.id,
        method: 'PUT',
        form: {
          user: JSON.stringify(noEditRolesUser),
          event: JSON.stringify(event)
        },
        headers: { 'Authorization': 'Bearer ' + noEditRolesUser.token }
      };
      request(updateEventOptions, function (err: any, response: any, body: any) {
        if (err) return done(err);

        expect(response.statusCode).to.equal(403);
        done();
      });
    });
  })
})