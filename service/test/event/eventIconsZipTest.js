'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , http = require('node:http')
  , crypto = require('node:crypto')
  , os = require('node:os')
  , path = require('node:path')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , { expect } = require('chai')
  , createToken = require('../mockToken')
  , Icon = require('../../lib/api/icon')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

describe('event icons zip', function () {

  let app;
  let tempDir;
  let zipPath;

  beforeEach(async function () {
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
      .yields(null, createToken(new mongoose.Types.ObjectId(), ['READ_EVENT_ALL']));

    sinon.stub(EventModel, 'findById').resolves(new EventModel({ _id: 1, name: 'Mock Event' }));

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'event-icons-zip-test-'));
    zipPath = path.join(tempDir, 'icons.zip');

    app = require('../../lib/express').app;
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(tempDir);
  });

  function stubZip(err) {
    sinon.stub(Icon.prototype, 'getZipPath').callsFake(function (callback) {
      fs.outputFileSync(zipPath, 'zip');
      callback(err, zipPath);
    });
  }

  async function waitForRemoval(file) {
    for (let i = 0; i < 50 && fs.existsSync(file); i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return !fs.existsSync(file);
  }

  it('sends the zip with a content length and removes the temp file', async function () {
    await fs.outputFile(path.join(tempDir, 'icons', 'icon.png'), 'png');
    sinon.stub(Icon.prototype, 'getBasePath').returns(path.join(tempDir, 'icons'));
    sinon.stub(Icon.prototype, 'getZipPath').callsFake(function (callback) {
      this.writeZip(zipPath, function (err) {
        callback(err, zipPath);
      });
    });

    const res = await request(app)
      .get('/api/events/1/form/icons.zip')
      .set('Authorization', 'Bearer 12345')
      .buffer(true)
      .parse(function (res, callback) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).to.equal('application/zip');
    expect(Number(res.headers['content-length'])).to.equal(res.body.length);
    expect(res.body.subarray(0, 4).toString('binary')).to.equal('PK\u0003\u0004');
    expect(await waitForRemoval(zipPath)).to.be.true;
  });

  it('responds 500 and removes the temp file when the zip fails', async function () {
    stubZip(new Error('zip failed'));

    await request(app)
      .get('/api/events/1/form/icons.zip')
      .set('Authorization', 'Bearer 12345')
      .expect(500);

    expect(await waitForRemoval(zipPath)).to.be.true;
  });

  it('removes the temp file when the client aborts the download', async function () {
    sinon.stub(Icon.prototype, 'getZipPath').callsFake(function (callback) {
      fs.outputFileSync(zipPath, crypto.randomBytes(32 * 1024 * 1024));
      callback(null, zipPath);
    });

    const server = app.listen(0);
    try {
      await new Promise(function (resolve, reject) {
        const req = http.get({
          port: server.address().port,
          path: '/api/events/1/form/icons.zip',
          headers: { Authorization: 'Bearer 12345' }
        }, function (res) {
          expect(res.statusCode).to.equal(200);
          req.destroy();
          resolve();
        });
        req.on('error', function (err) {
          if (!req.destroyed) reject(err);
        });
      });

      expect(await waitForRemoval(zipPath)).to.be.true;
    } finally {
      server.close();
    }
  });
});
