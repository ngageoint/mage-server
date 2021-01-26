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
  const self = this;

  streamable.type('application/zip');
  streamable.attachment('mage-kml.zip');

  // Known bug in Google Earth makes embedded images from a kmz file not render properly.
  // Treating it as a zip file for now.
  const archive = archiver('zip');
  archive.pipe(streamable);
  const kmlStream = new stream.PassThrough();
  archive.append(kmlStream, { name: 'mage-export.kml' });

  kmlStream.write(writer.generateKMLHeader());
  kmlStream.write(writer.generateKMLDocument());

  async.series([
    function (done) {
      if (!self._filter.exportObservations) return done();

      self.streamObservations(kmlStream, archive, function (err) {
        done(err);
      });
    },
    function (done) {
      if (!self._filter.exportLocations) return done();

      kmlStream.write(writer.generateUserStyles(self._users));

      async.eachSeries(Object.keys(self._users), function (userId, callback) {
        self.streamUserLocations(kmlStream, archive, self._users[userId], callback);
      },
        function (err) {
          done(err);
        });
    }
  ],
    function (err) {
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
        let form = null;
        let primary = null;
        let secondary = null;
        if (observation.properties.forms.length) {
          form = this._event.formMap[observation.properties.forms[0].formId];
          primary = observation.properties.forms[0][form.primaryField];
          secondary = observation.properties.forms[0][form.variantField];
        }

        const name = primary || this._event.name;

        stream.write(writer.generateObservationPlacemark(name, observation, this._event, primary, secondary));

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
  const self = this;

  log.info('writing locations for user ' + user.username);

  const startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  const endDate = self._filter.endDate ? moment(self._filter.endDate) : null;

  const cursor = self.requestLocations({ startDate: startDate, endDate: endDate, stream: true });

  let locations = [];
  let locationString = "";
  cursor.eachAsync(async function (location, i) {
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
  }).catch(err => {
    done(err);
  });
};