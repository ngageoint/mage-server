const sinon = require('sinon')
  , proxyquire = require('proxyquire')
  , fs = require('fs-extra')
  , os = require('node:os')
  , path = require('node:path')
  , { PassThrough } = require('node:stream')
  , { expect } = require('chai')
  , Icon = require('../../lib/api/icon');

describe('icon zip', function () {

  let tempDir;

  beforeEach(async function () {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'icon-zip-test-'));
    await fs.outputFile(path.join(tempDir, 'icons', 'icon.png'), 'png');
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(tempDir);
  });

  it('writes the icons directory to the zip', function (done) {
    const icon = new Icon('1');
    sinon.stub(icon, 'getBasePath').returns(path.join(tempDir, 'icons'));
    const zipPath = path.join(tempDir, 'icons.zip');

    icon.writeZip(zipPath, function (err) {
      expect(err).to.not.exist;
      expect(fs.statSync(zipPath).size).to.be.greaterThan(0);
      done();
    });
  });

  it('calls back once with the error when the zip cannot be written', function (done) {
    const icon = new Icon('1');
    sinon.stub(icon, 'getBasePath').returns(path.join(tempDir, 'icons'));

    icon.writeZip(path.join(tempDir, 'missing', 'icons.zip'), function (err) {
      expect(err).to.have.property('code', 'ENOENT');
      setImmediate(done);
    });
  });

  describe('with a fake archive', function () {

    let archive;
    let FakeIcon;

    beforeEach(function () {
      archive = new PassThrough();
      archive.directory = sinon.stub();
      archive.finalize = sinon.stub().resolves();
      FakeIcon = proxyquire('../../lib/api/icon', {
        'archiver': function () { return archive; }
      });
    });

    it('calls back once with the archive error', function (done) {
      const error = new Error('archive failed');

      new FakeIcon('1').writeZip(path.join(tempDir, 'icons.zip'), function (err) {
        expect(err).to.equal(error);
        setImmediate(done);
      });
      archive.destroy(error);
    });
  });
});
