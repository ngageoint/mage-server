'use strict';

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
  , environment = require('../environment/env')
  , User = require('../models/user');

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

      this.streamLocations(kmlStream, archive, done);
    }
  ],
    err => {
      if (err) log.warn(err);

      kmlStream.write(writer.generateKMLDocumentClose());
      kmlStream.write(writer.generateKMLClose());
      kmlStream.end();

      archive.finalize();
    });
};

Kml.prototype.streamObservations = function (stream, archive, done) {

  log.info("Retrieving icons from DB for the event " + this._event.name);
  Icon.getAll({ eventId: this._event._id }, (err, icons) => {
    if (err) return done(err);

    log.info("Retrieved " + icons.length + " icons");
    stream.write(writer.generateObservationStyles(this._event, icons));
    stream.write(writer.generateKMLFolderStart(this._event.name));

    log.info('Retrieving observations from DB');
    const cursor = this.requestObservations(this._filter);

    let numObservations = 0;
    cursor.eachAsync(async observation => {
      stream.write(writer.generateObservationPlacemark(observation, this._event));

      if (observation.attachments) {
        observation.attachments
          .filter(attachment => !!attachment.relativePath)
          .forEach(attachment => {
          archive.file(path.join(attachmentBase, attachment.relativePath), { name: attachment.relativePath });
        });
      }

      numObservations++;
    }).then(() => {
      if (cursor) cursor.close;

      log.info('Successfully wrote ' + numObservations + ' observations to KML');
      stream.write(writer.generateKMLFolderClose());

      // throw in icons
      archive.directory(new api.Icon(this._event._id).getBasePath(), 'icons/' + this._event._id, { date: new Date() });

      done();
    }).catch(err => done(err));
  });
};

Kml.prototype.streamLocations = async function (stream, archive, done) {
  log.info('Retrieving locations from DB');

  const startDate = this._filter.startDate ? moment(this._filter.startDate) : null;
  const endDate = this._filter.endDate ? moment(this._filter.endDate) : null;

  const cursor = this.requestLocations({ startDate: startDate, endDate: endDate });

  let user = null;

  let userStyles = "";
  let numLocations = 0;
  let locationString = '';
  cursor.eachAsync(async location => {

    if (!user || user._id.toString() !== location.userId.toString()) {

      if (user) {
        //complete the prrevious user
        this.completeUserFolder(stream, archive, user, locationString);
      }

      locationString = '';

      user = await User.getUserById(location.userId);
      userStyles += writer.generateUserStyle(user);
      stream.write(writer.generateKMLFolderStart(user.displayName, false));
    }

    locationString += writer.generateLocationPlacemark(user, location);
    numLocations++;
  }).then(() => {
    if (cursor) cursor.close;

    if (user) {
      //complete the last user
      this.completeUserFolder(stream, archive, user, locationString);
    }

    stream.write(userStyles);

    log.info('Successfully wrote ' + numLocations + ' locations to KML');

    done();
  }).catch(err => done(err));
};

Kml.prototype.completeUserFolder = async function (stream, archive, user, locationString) {

  stream.write(locationString);
  // throw in user map icon
  if (user.icon && user.icon.relativePath) {
    archive.file(path.join(userBase, user.icon.relativePath), {
      name: 'icons/users/' + user._id.toString(),
      date: new Date()
    });
  }
  stream.write(writer.generateKMLFolderClose());
}