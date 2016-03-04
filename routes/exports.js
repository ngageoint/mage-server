module.exports = function(app, security) {
  var moment = require('moment')
    , async = require('async')
    , log = require('winston')
    , config = require('../config')
    , api = require('../api')
    , Location = require('../models/location')
    , Event = require('../models/event')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Icon = require('../models/icon')
    , access = require('../access')
    , generateKml = require('../utilities/generate_kml')
    , fs = require('fs-extra')
    , path = require('path')
    , geojson = require('../transformers/geojson')
    , shp = require('../shp-write')
    , json2csv = require('json2csv')
    , json2csvStream = require('json2csv-stream')
    , stream = require('stream')
    , archiver = require('archiver')
    , exec = require('child_process').exec
    , environment = require('environment');

  var attachmentBase = environment.attachmentBaseDirectory;

  var passport = security.authentication.passport;

  function parseQueryParams(req, res, next) {
    var parameters = {filter: {}};

    var startDate = req.param('startDate');
    if (startDate) {
      parameters.filter.startDate = moment.utc(startDate).toDate();
    }

    var endDate = req.param('endDate');
    if (endDate) {
      parameters.filter.endDate = moment.utc(endDate).toDate();
    }

    var eventId = req.param('eventId');
    if (!eventId) {
      return res.status(400).send("eventId is required");
    }
    parameters.filter.eventId = eventId;

    var observations = req.param('observations');
    if (observations) {
      parameters.filter.exportObservations = observations === 'true';
    }

    var locations = req.param('locations');
    if (locations) {
      parameters.filter.exportLocations = locations === 'true';
    }

    req.parameters = parameters;

    next();
  }

  function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      Event.eventHasUser(req.event, req.user._id, function(err, eventHasUser) {
        if (eventHasUser) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function getEvent(req, res, next) {
    //get layers for lookup
    Event.getById(req.parameters.filter.eventId, {}, function(err, event) {
      req.event = event;

      // create a field by name map, I will need this later
      var fieldNameToField = {};
      event.form.fields.forEach(function(field) {
        fieldNameToField[field.name] = field;
      });
      event.form.fieldNameToField = fieldNameToField;

      next(err);
    });
  }

  function mapUsers(req, res, next) {
    //get users for lookup
    User.getUsers(function (err, users) {
      var map = {};
      users.forEach(function(user) {
        map[user._id] = user;
      });
      req.users = map;

      next();
    });
  }

  function mapDevices(req, res, next) {
    //get users for lookup
    Device.getDevices(function (err, devices) {
      var map = {};
      devices.forEach(function(device) {
        map[device._id] = device;
      });
      req.devices = map;

      next(err);
    });
  }

  function mapObservationProperties(observation, form) {
    observation.properties = observation.properties || {};
    for (var name in observation.properties) {
      if (name === 'type') continue;

      if (name === 'timestamp') {
        observation.properties.timestamp = moment(observation.properties.timestamp).toISOString();
      }

      var field = form.fieldNameToField[name];
      if (field) {
        observation.properties[field.title] = observation.properties[name];
        delete observation.properties[name];
      }
    }

    observation.properties.id = observation._id;
  }

  function mapObservations(observations, req) {
    if (!Array.isArray(observations)) observations = [observations];

    observations.forEach(function(o) {
      // TODO map all observation generic field names to their titles
      mapObservationProperties(o, req.event.form);

      if (req.users[o.userId]) o.properties.user = req.users[o.userId].username;
      if (req.devices[o.deviceId]) o.properties.device = req.devices[o.deviceId].uid;

      delete o.deviceId;
      delete o.userId;
    });
  }

  function createTmpDirectory(req, res, next) {
    var directory = "/tmp/mage-export-" + new Date().getTime();
    fs.mkdirp(directory, function(err) {
      if (err) return next(err);

      req.directory = directory;
      next();
    });
  }

  function requestLocations(event, options, done) {
    var filter = {
      eventId: event._id
    };

    if (options.userId) filter.userId = options.userId;
    if (options.lastLocationId) filter.lastLocationId = options.lastLocationId;
    if (options.startDate) filter.startDate = options.startDate.toDate();
    if (options.endDate) filter.endDate = options.endDate.toDate();

    Location.getLocations({filter: filter, limit: options.limit}, function(err, locations) {
      if(err) return done(err);
      done(null, locations);
    });
  }

  app.get(
    '/api/:exportType(geojson|kml|shapefile|csv)',
    passport.authenticate('bearer'),
    parseQueryParams,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    createTmpDirectory,
    function(req, res, next) {
      switch (req.params.exportType) {
      case 'shapefile':
        log.info('exporting shapefiles...');
        exportShapefile(req, res, next);
        break;
      case 'kml':
        log.info('exporting KML...');
        exportKML(req, res, next);
        break;
      case 'geojson':
        log.info('exporting GeoJSON...');
        exportGeoJSON(req, res, next);
        break;
      case 'csv':
        log.info('exporting CSV...');
        exportCsv(req, res, next);
        break;
      }
    }
  );

  function exportShapefile(req, res, next) {
    var event = req.event;
    var now = new Date();

    function eventToShapefile(done) {
      if (!req.parameters.filter.exportObservations) return done(null, []);

      var filter = req.parameters.filter;
      filter.states = ['active'];
      new api.Observation(event).getAll(filter, function(err, observations){
        if (err) return done(err);

        mapObservations(observations, req);

        var streams = {
          shp: fs.createWriteStream(req.directory + "/" + event.name + ".shp"),
          shx: fs.createWriteStream(req.directory + "/" + event.name + ".shx"),
          dbf: fs.createWriteStream(req.directory + "/" + event.name + ".dbf"),
          prj: fs.createWriteStream(req.directory + "/" + event.name + ".prj")
        };
        shp.writeGeoJson(streams, {features: JSON.parse(JSON.stringify(observations))}, function(err, files) {
          done(err, {event: event, files: files});
        });
      });
    }

    function locationsToShapefiles(done) {
      if (!req.parameters.filter.exportLocations) return done(null, []);

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;
      var lastLocationId = null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, {startDate: startDate, endDate: endDate, lastLocationId: lastLocationId}, function(err, requestedLocations) {
          if (err) return done(err);

          locations = requestedLocations;

          log.info('got some locations ' + locations.length);

          locations.forEach(function(l) {
            if (req.users[l.properties.user]) l.properties.user = req.users[l.properties.user].username;
            if (req.users[l.properties.deviceId]) l.properties.device = req.users[l.properties.deviceId].uid;

            delete l.properties.deviceId;
          });

          var first = locations.slice(1).pop();
          var last = locations.slice(-1).pop();
          if (last) {
            var interval = moment(first.properties.timestamp).toISOString() + '_' +
              moment(last.properties.timestamp).toISOString();

            var streams = {
              shp: fs.createWriteStream(req.directory + "/locations_" + interval + ".shp"),
              shx: fs.createWriteStream(req.directory + "/locations_" + interval + ".shx"),
              dbf: fs.createWriteStream(req.directory + "/locations_" + interval + ".dbf"),
              prj: fs.createWriteStream(req.directory + "/locations_" + interval + ".prj")
            };

            shp.writeGeoJson(streams, {features: JSON.parse(JSON.stringify(locations))}, function(err) {
              if (err) return done(err);

              log.info('Successfully wrote ' + locations.length + ' locations to SHAPEFILE');

              var locationTime = moment(last.properties.timestamp);
              lastLocationId = last._id;
              if (!startDate || startDate.isBefore(locationTime)) {
                startDate = locationTime;
              }

              done();
            });
          } else {
            done();
          }
        });
      },
      function() {
        return locations.length === 0;
      },
      function(err) {
        log.info('done writing all locations for to SHAPEFILE', err);

        done(err);
      });
    }

    function generateZip(err) {
      if (err) return next(err);
      var zipFile = '/tmp/mage-shapefile-export-' + now.getTime() + '.zip';
      exec("zip -r " + zipFile + " " + req.directory + "/",
        function (err) {
          log.info('something bad happened', err);
          if (err !== null) {
            return next(err);
          }

          // stream zip to client
          var stream = fs.createReadStream(zipFile);
          stream.on('end', function() {
            // remove dir
            fs.remove(req.directory, function(err) {
              if (err) log.info('could not remove shapfile dir', req.directory);
            });

            // remove zip file
            fs.remove(zipFile, function(err) {
              if (err) log.info('could not remove shapfile zip', zipFile);
            });
          });

          var stat = fs.statSync(zipFile);

          res.type('application/zip');
          res.attachment(zipFile);
          res.header('Content-Length', stat.size);
          res.cookie("fileDownload", "true", {path: '/'});
          stream.pipe(res);
        }
      );
    }

    async.parallel({
      events: eventToShapefile,
      locations: locationsToShapefiles
    }, generateZip);
  }

  function exportKML(req, res) {
    var event = req.event;

    res.type('application/zip');
    res.attachment('mage-export-kml.zip');
    res.cookie("fileDownload", "true", {path: '/'});

    //Known bug in Google Earth makes embedded images from a kmz file not render properly.  Treating
    //it as a zip file for now.
    var archive = archiver('zip');
    archive.pipe(res);
    var kmlStream = new stream.PassThrough();
    archive.append(kmlStream, { name:'mage-export.kml' });

    kmlStream.write(generateKml.generateKMLHeader());
    kmlStream.write(generateKml.generateKMLDocument());

    function streamObservations(stream, archive, done) {
      if (!req.parameters.filter.exportObservations) return done(null);

      var filter = req.parameters.filter;
      filter.states = ['active'];
      new api.Observation(event).getAll({filter: filter}, function(err, observations) {
        Icon.getAll({eventId: event._id}, function(err, icons) {
          kmlStream.write(generateKml.generateStyles(event, icons));
          stream.write(generateKml.generateKMLFolderStart(event.name, false));

          observations.forEach(function(o) {
            var variant = o.properties[event.form.variantField];
            mapObservations(o, req);
            stream.write(generateKml.generatePlacemark(o.properties.type, o, event, variant));

            o.attachments.forEach(function(attachment) {
              archive.file(path.join(config.server.attachment.baseDirectory, attachment.relativePath), {name: path.join('attachments', attachment.relativePath)});
            });
          });

          stream.write(generateKml.generateKMLFolderClose());

          done();
        });
      });
    }

    function streamUserLocations(stream, user, done) {
      log.info('writing locations for user ' + user.username);

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;

      var lastLocationId = null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, {startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, userId: user._id}, function(err, requestedLocations) {
          if (err) return done(err);
          locations = requestedLocations;

          if (!lastLocationId && locations.length) { // first time through
            stream.write(generateKml.generateKMLFolderStart('user: ' + user.username, false));
          }

          locations.forEach(function(location) {
            stream.write(generateKml.generatePlacemark('FFT', location));
          });

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
        if (lastLocationId) { // if we got at least one location
          stream.write(generateKml.generateKMLFolderClose());
        }
        log.info('done writing all locations for ' + user.username);
        done(err);
      });
    }

    async.series([
      function(done) {
        if (!req.parameters.filter.exportObservations) return done();

        streamObservations(kmlStream, archive, function(err) {
          if (err) return done(err);

          // throw in icons
          archive.bulk([{
            cwd: new api.Icon(event._id).getBasePath(),
            src: ['**'],
            dest: 'icons/' + event._id,
            expand: true,
            data: { date: new Date() } }
          ]);

          done();
        });
      },
      function(done) {
        if (!req.parameters.filter.exportLocations) return done();

        async.eachSeries(Object.keys(req.users), function(userId, callback) {
          streamUserLocations(kmlStream,  req.users[userId], callback);
        },
        function(err) {
          done(err);
        });
      }
    ],
    function(err) {
      if (err) {
        log.info(err);
      }

      kmlStream.write(generateKml.generateKMLDocumentClose());
      kmlStream.end(generateKml.generateKMLClose());

      archive.finalize();
    });
  }

  function exportGeoJSON(req, res) {
    var event = req.event;

    function streamFeatures(stream, done) {
      var filter = req.parameters.filter;
      filter.states = ['active'];
      new api.Observation(event).getAll({filter: filter}, function(err, observations) {
        mapObservations(observations, req);

        stream.write(JSON.stringify({
          type: 'FeatureCollection',
          features: geojson.transform(observations)
        }));

        done();
      });
    }

    function streamLocations(stream, done) {
      log.info('writing locations...');
      var limit = 2000;

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;
      var lastLocationId = null;

      stream.write('{"type": "FeatureCollection", "features": [');
      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, {startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
          if (err) return done(err);
          locations = requestedLocations;

          if (locations.length) {
            if (lastLocationId) stream.write(",");  // not first time through

            var data = JSON.stringify(locations);
            stream.write(data.substr(1, data.length - 2));
          } else {
            stream.write(']}');
          }

          log.info('Successfully wrote ' + locations.length + ' locations to GeoJSON');
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
        log.info('done writing locations');
        done(err);
      });
    }

    ////////////////////////////////////////////////////////////////////
    //END DEFINE SERIES FUNCTIONS///////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    res.type('application/zip');
    res.attachment("mage-export-geojson.zip");
    res.cookie("fileDownload", "true", {path: '/'});

    var archive = archiver('zip');
    archive.pipe(res);

    async.parallel([
      function(done) {
        if (!req.parameters.filter.exportObservations) return done();

        var observationStream = new stream.PassThrough();
        archive.append(observationStream, { name:'mage-export/observations.geojson' });
        streamFeatures(observationStream, function(err) {
          if (err) return done(err);

          observationStream.end();

          // throw in attachments
          archive.bulk([{
            cwd: path.join(config.server.attachment.baseDirectory, event.collectionName),
            src: ['*/**'],
            dest: 'mage-export/attachments',
            expand: true,
            data: { date: new Date() } }
          ]);

          // throw in icons
          archive.bulk([{
            cwd: new api.Icon(event._id).getBasePath(),
            src: ['*/**'],
            dest: 'mage-export/icons',
            expand: true,
            data: { date: new Date() } }
          ]);

          done();
        });
      },
      function(done) {
        if (!req.parameters.filter.exportLocations) return done();

        var locationStream = new stream.PassThrough();
        archive.append(locationStream, {name: 'mage-export/locations.geojson'});
        streamLocations(locationStream, function(err) {
          if (err) return done(err);

          locationStream.end();

          done();
        });
      }
    ],
    function(err) {
      if (err) {
        log.info(err);
      }

      archive.finalize();
    });
  }

  function exportCsv(req, res) {
    var event = req.event;

    var fields = ['id', 'user', 'device', 'latitude', 'longitude', 'timestamp', 'excelTimestamp'];
    var fieldNames = ['id', 'User', 'Device', 'Latitude', 'Longitude', 'Date (ISO8601)', 'Excel Timestamp (UTC)'];

    req.event.form.fields.forEach(function(field) {
      if (field.title === 'Location' || field.name === 'timestamp' || field.archived) return;
      fields.push(field.name);
      fieldNames.push(field.title);
    });
    fields.push('attachment');
    fieldNames.push('Attachment');

    fields.push('attachmentExcelLink');
    fieldNames.push('Attachment Excel Link');

    function excelLink(attachment, attachmentNumber) {
      return '=HYPERLINK("' + attachment.name + '", "attachment' + attachmentNumber + '")';
    }

    function flatten(observations, req) {
      var flattened = [];

      observations.forEach(function(observation) {
        var properties = observation.properties;
        properties.id = observation.id;

        if (req.users[observation.userId]) properties.user = req.users[observation.userId].username;
        if (req.devices[observation.deviceId]) properties.device = req.devices[observation.deviceId].uid;

        properties.longitude = observation.geometry.coordinates[0];
        properties.latitude = observation.geometry.coordinates[1];

        properties.excelTimestamp = "=DATEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),1,10)) + TIMEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),12,8))";

        if (observation.attachments.length > 0) {
          properties.attachment = observation.attachments[0].name;
          properties.attachmentExcelLink = excelLink(observation.attachments[0], 1);
        }

        flattened.push(properties);

        for (var i = 1; i < observation.attachments.length; i++) {
          flattened.push({
            id: observation.id,
            attachment: observation.attachments[i].name,
            attachmentExcelLink: excelLink(observation.attachments[i], i + 1)
          });
        }
      });

      return flattened;
    }

    function streamFeatures(stream, done) {
      var filter = req.parameters.filter;
      filter.states = ['active'];
      new api.Observation(event).getAll({filter: filter}, function(err, observations) {
        var data = flatten(observations, req);

        json2csv({data: data, fields: fields, fieldNames: fieldNames}, function(err, csv) {
          if (err) return done(err);

          stream.write(csv);
          done();
        });
      });
    }

    function streamLocations(stream, done) {
      log.info('writing locations...');
      var limit = 2000;

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;
      var lastLocationId = null;

      var locations = [];
      stream.write('[');

      function flatten(locations) {
        return locations.map(function(location) {
          var properties = location.properties;
          if (req.users[location.userId]) properties.user = req.users[location.userId].username;
          if (req.devices[properties.deviceId]) properties.device = req.devices[properties.deviceId].uid;

          properties.longitude = location.geometry.coordinates[0];
          properties.latitude = location.geometry.coordinates[1];

          return properties;
        });
      }

      async.doUntil(function(done) {
        requestLocations(event, {startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
          if (err) return done(err);
          locations = requestedLocations;

          if (locations.length) {
            if (lastLocationId) {
              stream.write(",");  // not first time through
            }

            var data = JSON.stringify(flatten(locations));
            stream.write(data.substr(1, data.length - 2));
          } else {
            stream.write(']');
          }

          log.info('Successfully wrote ' + locations.length + ' locations to CSV');
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
        log.info('done writing locations');
        done(err);
      });
    }

    ////////////////////////////////////////////////////////////////////
    //END DEFINE SERIES FUNCTIONS///////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    res.type('application/zip');
    res.attachment("mage-export-csv.zip");
    res.cookie("fileDownload", "true", {path: '/'});

    var archive = archiver('zip');
    archive.pipe(res);

    async.parallel([
      function(done) {
        if (!req.parameters.filter.exportObservations) return done();

        var observationStream = new stream.PassThrough();
        archive.append(observationStream, { name:'mage-export/observations.csv' });
        streamFeatures(observationStream, function(err) {
          if (err) return done(err);

          observationStream.end();

          // throw in attachments
          archive.bulk([{
            cwd: path.join(attachmentBase, event.collectionName),
            src: ['**/*.*'],
            dest: 'mage-export',
            expand: true,
            flatten: true,
            data: { date: new Date() } }
          ]);

          done();
        });
      },
      function(done) {
        if (!req.parameters.filter.exportLocations) return done();

        // var locationStream = new stream.PassThrough();
        var locationStream = new json2csvStream({
          keys: ['user', 'device', 'timestamp', 'latitude', 'longitude', 'accuracy', 'bearing', 'speed', 'altitude']
        });
        archive.append(locationStream, {name: 'mage-export/locations.csv'});
        streamLocations(locationStream, function(err) {
          if (err) return done(err);

          locationStream.end();

          done();
        });
      }
    ],
    function(err) {
      if (err) {
        log.info(err);
      }

      archive.finalize();
    });
  }
};
