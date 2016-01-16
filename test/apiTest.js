var request = require('supertest')
  , sinon = require('sinon')
  , app = require('../express')
  , mongoose = require('mongoose')
  , Setting = require('../models/setting')
  , SettingModel = mongoose.model('Setting')
  , User = require('../models/user')
  , UserModel = mongoose.model('User');

require('sinon-mongoose');
require('chai').should();

describe("api route tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("api should return configuration", function(done) {
    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({type: 'disclaimer'})
      .yields(null, {
      	type : "banner",
      	settings : {
      		footerText : "Footer Text",
      		showFooter : false,
      		headerText : "Header Text",
      		showHeader : false,
      		footerBackgroundColor : "#ffffff",
      		footerTextColor : "#000000",
      		headerBackgroundColor : "#ffffff",
      		headerTextColor : "#000000"
      	}
      });

    sandbox.mock(UserModel)
      .expects('count')
      .withArgs({})
      .yields(null, 1);

    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) {
        var config = res.body;
        config.should.have.property('version');
        config.should.have.property('authenticationStrategies');
        config.should.have.property('provision');
        config.should.have.property('disclaimer');
      })
      .end(done)
  });

  it("api should return initial", function(done) {
    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({type: 'disclaimer'})
      .yields(null, {});

    sandbox.mock(UserModel)
      .expects('count')
      .withArgs({})
      .yields(null, 0);

    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) {
        var config = res.body;
        config.should.have.property('initial').that.is.true;
      })
      .end(done)
  });

  it("api should not return initial", function(done) {
    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({type: 'disclaimer'})
      .yields(null, {});

    sandbox.mock(UserModel)
      .expects('count')
      .withArgs({})
      .yields(null, 2);

    request(app)
      .get('/api')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) {
        var config = res.body;
        config.should.not.have.property('initial');
      })
      .end(done)
  });

});
