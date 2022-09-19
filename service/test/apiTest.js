"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , UserModel = require('../lib/models/user')
  , SecurePropertyAppender = require('../lib/security/utilities/secure-property-appender')
  , AuthenticationApiAppender = require('../lib/utilities/authenticationApiAppender')
  , AuthenticationConfigurationModel = require('../lib/models/authenticationconfiguration')
  , SettingModel = require('../lib/models/setting');

require('sinon-mongoose');

describe("api route tests", function () {

  let app;

  beforeEach(function () {
    this.timeout(10000);

    const configs = [];
    const config = {
      name: 'local',
      type: 'local'
    };
    configs.push(config);

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getAllConfigurations')
      .resolves(configs);

    sinon.mock(SecurePropertyAppender)
      .expects('appendToConfig')
      .resolves(config);

    app = require('../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  it("api should return configuration", function (done) {
    const api = {
      version: '1',
      authenticationStrategies: [],
      disclaimer: '',
      initial: true
    }
    sinon.mock(AuthenticationApiAppender)
      .expects('append')
      .resolves(api);

    const settingMock = sinon.mock(SettingModel);

    settingMock.expects('getSetting')
      .withArgs('disclaimer')
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

    settingMock.expects('getSetting')
      .withArgs('contactinfo')
      .resolves({
        type: "contactinfo",
        settings: {
        }
      });

    const authentication = {
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: []
    };

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getConfigurationsByType')
      .resolves([authentication]);

    sinon.mock(UserModel)
      .expects('count')
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
    const api = {
      version: '1',
      authenticationStrategies: [],
      disclaimer: '',
      initial: true
    }
    sinon.mock(AuthenticationApiAppender)
      .expects('append')
      .resolves(api);

    const settingMock = sinon.mock(SettingModel);

    settingMock.expects('getSetting')
      .withArgs('disclaimer')
      .resolves({});

    settingMock.expects('getSetting')
      .withArgs('contactinfo' )
      .resolves({});

    sinon.mock(UserModel)
      .expects('count')
      .yields(null, 0);

    const authentication = {
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: []
    };

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getConfigurationsByType')
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
    const api = {
      version: '1',
      authenticationStrategies: [],
      disclaimer: ''
    }
    sinon.mock(AuthenticationApiAppender)
      .expects('append')
      .resolves(api);

    const settingMock = sinon.mock(SettingModel);

    settingMock.expects('getSetting')
      .withArgs('disclaimer')
      .resolves({});

    settingMock.expects('getSetting')
      .withArgs('contactinfo')
      .resolves({});

    sinon.mock(UserModel)
      .expects('count')
      .yields(null, 2);

    const authentication = {
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: []
    };

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getConfigurationsByType')
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