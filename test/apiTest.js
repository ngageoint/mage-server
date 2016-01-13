var request = require('supertest')
  , sinon = require('sinon')
  , app = require('../express')
  , mongoose = require('mongoose')
  , Setting = require('../models/setting')
  , SettingModel = mongoose.model('Setting');

require('sinon-mongoose');
require('chai').should();

describe("api route tests", function() {

  it("api should return configuration", function(done) {
    sinon.mock(SettingModel)
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
        config.should.have.property('locationServices');
        config.should.have.property('apk');
        config.should.have.property('disclaimer');
      })
      .end(done)
  });

});
