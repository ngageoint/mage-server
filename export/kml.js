var util = require('util')
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

var userBase = environment.userBaseDirectory;
var attachmentBase = environment.attachmentBaseDirectory;

function Kml(options) {
  Kml.super_.call(this, options);
}

util.inherits(Kml, Exporter);
module.exports = Kml;

Kml.prototype.export = function(streamable) {
  var self = this;

  streamable.type('application/zip');
  streamable.attachment('mage-kml.zip');

  // Known bug in Google Earth makes embedded images from a kmz file not render properly.
  // Treating it as a zip file for now.
  var archive = archiver('zip');
  archive.pipe(streamable);
  var kmlStream = new stream.PassThrough();
  archive.append(kmlStream, { name:'mage-export.kml' });

  kmlStream.write(writer.generateKMLHeader());
  kmlStream.write(writer.generateKMLDocument());

  async.series([
    function(done) {
      if (!self._filter.exportObservations) return done();

      self.streamObservations(kmlStream, archive, function(err) {
        done(err);
      });
    },
    function(done) {
      if (!self._filter.exportLocations) return done();

      kmlStream.write(writer.generateUserStyles(self._users));

      async.eachSeries(Object.keys(self._users), function(userId, callback) {
        self.streamUserLocations(kmlStream, archive, self._users[userId], callback);
      },
      function(err) {
        done(err);
      });
    }
  ],
  function(err) {
    if (err) log.info(err);

    kmlStream.write(writer.generateKMLDocumentClose());
    kmlStream.write(writer.generateKMLClose());
    kmlStream.end();

    archive.finalize();
  });
};

Kml.prototype.streamObservations = function(stream, archive, done) {
  if (!this._filter.exportObservations) return done();

  this.requestObservations(this._filter, (err, observations) => {
    Icon.getAll({ eventId: this._event._id}, (err, icons) => {
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
          archive.file(path.join(attachmentBase, attachment.relativePath), {name: attachment.relativePath});
        });
      });

      stream.write(writer.generateKMLFolderClose());

      // throw in icons
      archive.directory(new api.Icon(this._event._id).getBasePath(), 'icons/' + this._event._id, {date: new Date()});

      done();
    });
  });
};

Kml.prototype.streamUserLocations = function(stream, archive, user, done) {
  var self = this;

  log.info('writing locations for user ' + user.username);

  var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;

  var lastLocationId = null;

  var locations = [];
  async.doUntil(function(done) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, userId: user._id}, function(err, requestedLocations) {
      if (err) return done(err);
      locations = requestedLocations;

      if (!lastLocationId && locations.length) { // first time through
        stream.write(writer.generateKMLFolderStart(user.displayName, false));
      }

      var locationString = "";
      locations.forEach(function(location) {
        locationString += writer.generateLocationPlacemark(user, location);
      });
      stream.write(locationString);

      log.info('Successfully wrote ' + locations.length + ' locations to KML for user ' + user.username);
      var last = locations.slice(-1).pop();
      if (last) {
        var locationTime = moment(last.properties.timestamp);
        lastLocationId = last._id;
        if (!startDate || startDate.isBefore(locationTime)) {
          startDate = locationTime;
        }
      }

      done();
    });
  },
  function() {
    return locations.length === 0;
  },
  function(err) {
    // throw in user map icon
    if (user.icon && user.icon.relativePath) {
      archive.file(path.join(userBase, user.icon.relativePath), {
        name: 'icons/users/' + user._id.toString(),
        date: new Date()
      });
    }

    if (lastLocationId) { // if we got at least one location
      stream.write(writer.generateKMLFolderClose());
    }
    log.info('done writing all locations for ' + user.username);
    done(err);
  });
};
