"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , app = require('../express')
  , mongoose = require('mongoose');

require('../models/setting');
const SettingModel = mongoose.model('Setting');

require('../models/user');
const UserModel = mongoose.model('User');

const Authentication = require('../models/authentication');
const AuthenticationConfiguration = require('../models/authenticationconfiguration');

require('sinon-mongoose');
require('chai').should();

describe("api route tests", function () {

  afterEach(function () {
    sinon.restore();
  });

  it("api should return configuration", function (done) {
    sinon.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'disclaimer' })
      .chain('exec')
      .resolves({
        type: "banner",
        settings: {
          footerText: "Footer Text",
          showFooter: false,
          headerText: "Header Text",
          showHeader: false,
          footerBackgroundColor: "#ffffff",
          footerTextColor: "#000000",
          headerBackgroundColor: "#ffffff",
          headerTextColor: "#000000"
        }
      });

    const authentication = new Authentication.Local({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: []
    });

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('find')
      .resolves([authentication]);

    sinon.mock(UserModel)
      .expects('count')
      .withArgs({})
      .yields(null, 1);

    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function (res) {
        var config = res.body;
        config.should.have.property('version');
        config.should.have.property('authenticationStrategies');
        config.should.have.property('disclaimer');
      })
      .end(done);
  });

  it("api should return initial", function (done) {
    sinon.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'disclaimer' })
      .chain('exec')
      .resolves({});

    sinon.mock(UserModel)
      .expects('count')
      .withArgs({})
      .yields(null, 0);

    const authentication = new Authentication.Local({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: []
    });

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('find')
      .resolves([authentication]);

    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function (res) {
        var config = res.body;
        config.should.have.property('initial').that.is.true;
      })
      .end(done);
  });

  it("api should not return initial", function (done) {
    sinon.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'disclaimer' })
      .chain('exec')
      .resolves({});

    sinon.mock(UserModel)
      .expects('count')
      .withArgs({})
      .yields(null, 2);

    const authentication = new Authentication.Local({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: []
    });

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('find')
      .resolves([authentication]);

    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function (res) {
        var config = res.body;
        config.should.not.have.property('initial');
      })
      .end(done);
  });

});
