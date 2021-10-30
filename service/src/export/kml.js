const util = require('util')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , stream = require('stream')
  , path = require('path')
  , Icon = require('../models/icon')
  , Exporter = require('./exporter')
  , writer = require('./kmlWriter')
  , environment = require('../environment/env');

const userBase = environment.userBaseDirectory;
const attachmentBase = environment.attachmentBaseDirectory;

function Kml(options) {
  Kml.super_.call(this, options);
}

util.inherits(Kml, Exporter);
module.exports = Kml;

Kml.prototype.export = function (streamable) {
  // Known limitation in Google Earth, embedded media from a kmz file not render in a popup
  // Treating it as a zip, rather than a kmz.
  const archive = archiver('zip');
  archive.pipe(streamable);
  const kmlStream = new stream.PassThrough();
  archive.append(kmlStream, { name: 'mage-export.kml' });

  kmlStream.write(writer.generateKMLDocument());

  async.series([
    done => {
      if (!this._filter.exportObservations) return done();
      this.streamObservations(kmlStream, archive, done);
    },
    done => {
      if (!this._filter.exportLocations) return done();

      kmlStream.write(writer.generateUserStyles(this._users));

      async.eachSeries(Object.keys(this._users), (userId, callback) => {
        this.streamUserLocations(kmlStream, archive, this._users[userId], callback);
      }, done);
    }
  ],
  err => {
    if (err) log.info(err);

    kmlStream.write(writer.generateKMLDocumentClose());
    kmlStream.write(writer.generateKMLClose());
    kmlStream.end();

    archive.finalize();
  });
};

Kml.prototype.streamObservations = function (stream, archive, done) {
  if (!this._filter.exportObservations) return done();

  this.requestObservations(this._filter, (err, observations) => {
    Icon.getAll({ eventId: this._event._id }, (err, icons) => {
      stream.write(writer.generateObservationStyles(this._event, icons));
      stream.write(writer.generateKMLFolderStart(this._event.name, false));

      observations.forEach(observation => {
        stream.write(writer.generateObservationPlacemark(observation, this._event));

        observation.attachments.forEach(attachment => {
          archive.file(path.join(attachmentBase, attachment.relativePath), { name: attachment.relativePath });
        });
      });

      stream.write(writer.generateKMLFolderClose());

      // throw in icons
      archive.directory(new api.Icon(this._event._id).getBasePath(), 'icons/' + this._event._id, { date: new Date() });

      done();
    });
  });
};

Kml.prototype.streamUserLocations = function (stream, archive, user, done) {
  log.info('writing locations for user ' + user.username);

  const startDate = this._filter.startDate ? moment(this._filter.startDate) : null;
  const endDate = this._filter.endDate ? moment(this._filter.endDate) : null;

  const cursor = this.requestLocations({ userId: user._id, startDate: startDate, endDate: endDate, stream: true });

  const locations = [];
  let locationString = "";
  cursor.eachAsync(async location => {
    locationString += writer.generateLocationPlacemark(user, location);
    locations.push(location);
  }).then(() => {
    if (cursor) cursor.close;

    if (locations.length > 0) {
      stream.write(writer.generateKMLFolderStart(user.displayName, false));
      stream.write(locationString);
    }

    // throw in user map icon
    if (user.icon && user.icon.relativePath) {
      archive.file(path.join(userBase, user.icon.relativePath), {
        name: 'icons/users/' + user._id.toString(),
        date: new Date()
      });
    }

    if (locations.length > 0) {
      stream.write(writer.generateKMLFolderClose());
    }

    log.info('done writing all locations for ' + user.username);

    done();
  }).catch(err => done(err));
};