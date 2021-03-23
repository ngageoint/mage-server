const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
const TokenModel = mongoose.model('Token');

require('../../models/role');
const RoleModel = mongoose.model('Role');

require('../../models/user');
const UserModel = mongoose.model('User');

const Setting = require('../../models/setting');

const Authentication = require('../../models/authentication');
const AuthenticationModel = mongoose.model('Authentication');

const svgCaptcha = require('svg-captcha');

require('sinon-mongoose');

async function captcha() {
  sinon.stub(svgCaptcha, 'create').returns({
    text: 'captcha',
    data: 'image'
  });

  let jwt;
  await request(app)
    .post('/api/users/signups')
    .send({
      username: 'test',
    })
    .expect(200)
    .expect(function (res) {
      jwt = res.body.token;
      sinon.restore();
    });

  return jwt;
}

describe("user create tests", function () {

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it('should create user as admin', function (done) {
    mockTokenWithPermission('CREATE_USER');

    const id = mongoose.Types.ObjectId();
    const roleId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'password',
      passwordconfirm: 'password',
      roleId: roleId,
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });

    sinon.mock(Authentication)
      .expects('createAuthentication')
      .resolves(mockUser.authentication);

    sinon.mock(Setting)
      .expects('getSetting').withArgs('security')
      .resolves({
        settings: {
          [mockUser.authentication.type]: {
            usersReqAdmin: true
          }
        }
      })

    sinon.mock(mockUser)
      .expects('populate')
      .twice()
      .withArgs('roleId')
      .yields(null, mockUser);

    sinon.mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', true))
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        roleId: roleId
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
  });

  it('should fail to create user as admin w/o roleId', function (done) {
    mockTokenWithPermission('CREATE_USER');

    sinon.mock(Setting)
      .expects('getSetting').withArgs('security')
      .resolves({
        settings: {
          local: {
            usersReqAdmin: true
          }
        }
      });

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('roleId is a required field');
      })
      .end(done);
  });

  it('should create captcha', function (done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users/signups')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.have.property('token');
        res.body.should.have.property('captcha');
      })
      .end(done);
  });

  it('should fail to create captcha with no username', function (done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users/signups')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
      })
      .expect(400)
      .end(done);
  });

  it('should create user', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });

    sinon.mock(Authentication)
      .expects('createAuthentication')
      .resolves(mockUser.authentication);

    sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
      settings: {
        local: {
          usersReqAdmin: {
            enabled: true
          }
        }
      }
    }));

    sinon.mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sinon.mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', false))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      });
  });

  it('should create user and default admin approval to true', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });

    sinon.mock(Authentication)
      .expects('createAuthentication')
      .resolves(mockUser.authentication);

    sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
      settings: {
        local: {
        }
      }
    }));

    sinon.mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sinon.mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', false))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      });
  });

  it('should create user with no whitespace', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });

    sinon.mock(Authentication)
      .expects('createAuthentication')
      .resolves(mockUser.authentication);

    sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
      settings: {
        local: {
          usersReqAdmin: {
            enabled: true
          }
        }
      }
    }));

    sinon.mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sinon.mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('username', 'test'))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      });
  });

  it('should fail to create user with duplicate username', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });

    sinon.mock(Authentication)
      .expects('createAuthentication')
      .resolves(mockUser.authentication);

    sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
      settings: {
        local: {
        }
      }
    }));

    sinon.mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs(sinon.match.has('username', 'test'))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(409);
  });

  it('should fail to create user w/o displayName', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("Invalid account document: missing required parameter 'displayName'");
      });
  });

  it('should fail to create user with invalid email', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        email: 'notvalid',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Invalid email address');
      });
  });

  it('should fail to create user w/o password', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("Invalid account document: missing required parameter 'password'");
      });
  });

  it('should fail to create user w/o passwordconfirm', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'passwordpassword'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("Invalid account document: missing required parameter 'passwordconfirm'");
      });
  });

  it('should fail to create user when passsord and passwordconfirm do not match', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordconfirmpasswordconfirm'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Passwords do not match');
      });
  });

  it('should fail to create user when passsord does not meet complexity', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
      settings: {
        'local': {
          passwordPolicy: {
            helpText: 'Password must be at least 14 characters',
            passwordMinLengthEnabled: true,
            passwordMinLength: 14
          }
        }
      }
    }));

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Password must be at least 14 characters');
      });
    });

  it('should fail to create user with no captcha token', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Bad Request');
      });
  });

  it('should fail to create user with invalid captcha token', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 1')
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Invalid captcha, please try again');
      });
  });

  it('should fail to create user with invalid captcha text', async function () {
    mockTokenWithPermission('NO_PERMISSIONS');

    let jwt = await captcha();

    sinon.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'wrong'
      })
      .expect(403)
      .expect(function (res) {
        res.text.should.equal('Invalid captcha, please try again.');
      });
  });

});
