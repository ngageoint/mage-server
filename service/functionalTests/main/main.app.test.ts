import { expect } from 'chai'
import axios from 'axios'

const config = require('../config/httpconfig.json')
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

  async function signin(userToSignin: any, done: any): Promise<void> {
    try {
      const signinResponse = await axios.post(conUrl + "/auth/local/signin",
        new URLSearchParams({
          username: userToSignin.username,
          password: userToSignin.authentication.password
        })
      );
      expect(signinResponse.status).to.equal(200);

      const tokenResponse = await axios.post(conUrl + '/auth/token',
        new URLSearchParams({
          uid: userToSignin.device,
          user: JSON.stringify(userToSignin)
        }),
        { headers: { 'Authorization': 'Bearer ' + signinResponse.data.token } }
      );
      expect(tokenResponse.status).to.equal(200);
      userToSignin.token = tokenResponse.data.token;
      done();
    } catch (err) {
      done(err);
    }
  }

  after(function (done) {
    logout(noEditRolesUser, function (err: any) {
      logout(adminUser, function (_err2: any) {
        done();
      });
    });
  })

  function logout(userToLogout: any, done: any): void {
    axios.post(conUrl + '/api/logout', null, {
      headers: { 'Authorization': 'Bearer ' + userToLogout.token }
    }).then(() => {
      user.getUserByUsername(userToLogout.username, function (err: any, existingUser: any) {
        if (err) return done(err);
        user.deleteUser(existingUser, function (err: any) {
          done(err);
        });
      });
    }).catch(done);
  }

  it('applies authentication middleware to the web controllers', async function () {
    const eventsResponse = await axios.get(conUrl + "/api/events/", {
      headers: { 'Authorization': 'Bearer ' + adminUser.token }
    });
    expect(eventsResponse.status).to.equal(200);
    expect(Array.isArray(eventsResponse.data)).to.be.true;
    expect(eventsResponse.data.length).is.greaterThan(0);

    const event = eventsResponse.data[0];
    try {
      await axios.put(conUrl + "/api/events/" + event.id,
        new URLSearchParams({
          user: JSON.stringify(noEditRolesUser),
          event: JSON.stringify(event)
        }),
        { headers: { 'Authorization': 'Bearer ' + noEditRolesUser.token } }
      );
      throw new Error('Expected 403 but request succeeded');
    } catch (err: any) {
      if (err.response) {
        expect(err.response.status).to.equal(403);
      } else {
        throw err;
      }
    }
  })
})