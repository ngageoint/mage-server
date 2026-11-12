'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , api = require('../../lib/api')
  , EventModel = require('../../lib/models/event')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

describe("observation zip export", function () {

  let app;

  const userId = new mongoose.Types.ObjectId();
  const observationId = new mongoose.Types.ObjectId();

  beforeEach(function () {
    const mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      forms: [],
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

    const config = {
      name: 'local',
      type: 'local'
    };

    sinon.mock(AuthenticationConfiguration)
      .expects('getAllConfigurations')
      .resolves([config]);

    sinon.mock(SecurePropertyAppender)
      .expects('appendToConfig')
      .resolves(config);

    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, ['READ_OBSERVATION_ALL']));

    sinon.stub(api.Observation.prototype, 'getById').yields(null, {
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00',
        forms: []
      },
      attachments: []
    });

    sinon.stub(api.Icon.prototype, 'getIcon').yields(null, null);

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  it("sends the archive as a zip attachment", async function () {
    const res = await request(app)
      .get(`/api/events/1/observations/${observationId}.zip`)
      .set('Authorization', 'Bearer 12345')
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/^application\/zip/);
    expect(res.headers['content-disposition']).to.equal(`attachment; filename="${observationId}.zip"`);
  });
});
