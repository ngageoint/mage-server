"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , { expect } = require('chai')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , { setAttachmentHooks } = require('../../lib/plugins.api/plugins.api.attachments')
  , { GeoPackageUtility } = require('../../lib/utilities/geopackage')
  , CounterModel = require('../../lib/models/counter')
  , LayerModel = require('../../lib/models/layer')
  , Layer = require('../../lib/api/layer')
  , fs = require('fs-extra');

require('../../lib/models/token');
const TokenModel = mongoose.model('Token');

require('sinon-mongoose');

describe("layer GeoPackage content-scan tests", function () {

  let app;

  beforeEach(function () {
    const configs = [];
    const config = {
      name: 'local',
      type: 'local'
    };
    configs.push(config);

    sinon.mock(AuthenticationConfiguration)
      .expects('getAllConfigurations')
      .resolves(configs);

    sinon.mock(SecurePropertyAppender)
      .expects('appendToConfig')
      .resolves(config);

    // validateGeopackage runs before our AV scan and would otherwise reject these
    // tests' fake file bytes on its own, via real GeoPackage/SQLite parsing.
    sinon.stub(GeoPackageUtility.getInstance(), 'validate').resolves([]);

    // Layer.create() always calls this before branching into createGeoPackageLayer(),
    // regardless of outcome — unmocked, it hangs the same way userCreateTest.js's
    // unmocked findOne did.
    sinon.mock(CounterModel).expects('getNext').withArgs('layer').resolves(1);

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
    setAttachmentHooks([]);
  });

  const userId = new mongoose.Types.ObjectId();

  function authenticateAsCreator() {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: '12345' })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(createToken(userId, ['CREATE_LAYER']));
  }

  it('should reject a GeoPackage upload flagged by a content-scanning hook', function (done) {
    setAttachmentHooks([async () => ({ outcome: 'reject', reason: 'Eicar-Test-Signature' })]);
    authenticateAsCreator();

    request(app)
      .post('/api/layers')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .field('name', 'Test Layer Reject')
      .field('type', 'GeoPackage')
      .attach('geopackage', Buffer.from('irrelevant bytes'), 'test.gpkg')
      .expect(400)
      .expect(res => res.text.should.match(/GeoPackage upload rejected: Eicar-Test-Signature/))
      .end(done);
  });

  it('should return 400 without retrying when the scan hook itself errors', function (done) {
    setAttachmentHooks([async () => { throw new Error('clamd unreachable'); }]);
    authenticateAsCreator();

    request(app)
      .post('/api/layers')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .field('name', 'Test Layer Error')
      .field('type', 'GeoPackage')
      .attach('geopackage', Buffer.from('irrelevant bytes'), 'test.gpkg')
      .expect(400)
      .expect(res => res.text.should.match(/GeoPackage scan failed: clamd unreachable/))
      .end(done);
  });

  it('should copy the file and create the layer once the scan passes', async function () {
    setAttachmentHooks([async () => ({ outcome: 'pass' })]);

    const fsCopyMock = sinon.mock(fs).expects('copy').resolves();
    const fakeLayer = { _id: 1, type: 'GeoPackage' };
    const layerCreateMock = sinon.mock(LayerModel).expects('create').resolves(fakeLayer);

    const newLayer = {
      type: 'GeoPackage',
      name: 'Test Layer Pass',
      geopackage: {
        originalname: 'test.gpkg',
        mimetype: 'application/octet-stream',
        size: 123,
        filename: 'abc123.gpkg',
        path: '/tmp/abc123.gpkg'
      }
    };

    const result = await new Layer().create(newLayer);

    fsCopyMock.verify();
    layerCreateMock.verify();
    expect(result).to.equal(fakeLayer);
  });

});
