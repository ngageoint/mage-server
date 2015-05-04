module.exports = function(app, security) {
  var moment = require('moment')
    , config = require('../config')
    , api = require('../api')
    , Location = require('../models/location')
    , Event = require('../models/event')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Icon = require('../models/icon')
    , access = require('../access')
    , generate_kml = require('../utilities/generate_kml')
    , async = require('async')
    , fs = require('fs-extra')
    , sys = require('sys')
    , path = require('path')
    , toGeoJson = require('../utilities/togeojson')
    , geojson = require('../transformers/geojson')
    , shp = require('../shp-write')
    , stream = require('stream')
    , archiver = require('archiver')
    , DOMParser = require('xmldom').DOMParser
    , spawn = require('child_process').spawn
    , exec = require('child_process').exec
    , p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  var parseQueryParams = function(req, res, next) {
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
        eventHasUser ? next() : res.sendStatus(403);
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
    for (name in observation.properties){
      if (name === 'type' || name === 'timestamp') continue;

      var field = form.fieldNameToField[name];
      if (field) {
        observation.properties[field.title] = observation.properties[name];
        delete observation.properties[name];
      }
    }
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

  var createTmpDirectory = function(req, res, next) {
    var directory = "/tmp/mage-export-" + new Date().getTime();
    fs.mkdirp(directory, function(err) {
      req.directory = directory;
      next();
    });
  }

  var requestLocations = function(event, options, done) {
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
    '/api/:exportType(geojson|kml|shapefile,csv)',
    p***REMOVED***port.authenticate(authenticationStrategy),
    parseQueryParams,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    createTmpDirectory,
    function(req, res, next) {
      switch (req.params.exportType) {
        case 'shapefile':
          console.log('exporting shapefiles...');
          exportShapefile(req, res, next);
          break;
        case 'kml':
          console.log('exporting KML...');
          exportKML(req, res, next);
          break;
        case 'geojson':
          console.log('exporting GeoJSON...');
          exportGeoJSON(req, res, next);
          break;
        case 'csv':
          console.log('exporting CSV...');
          exportCsv(req, res, next);
          break;
      }
    }
  );

  var exportShapefile = function(req, res, next) {
    var event = req.event;
    var now = new Date();

    var eventToShapefile = function(done) {
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

    var locationsToShapefiles = function(done) {
      if (!req.parameters.filter.exportLocations) return done(null, []);

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;
      var lastLocationId = null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, {startDate: startDate, endDate: endDate, lastLocationId: lastLocationId}, function(err, requestedLocations) {
          if (err) return done(err)
          locations = requestedLocations;

          console.log('got some locations ' + locations.length);

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

            shp.writeGeoJson(streams, {features: JSON.parse(JSON.stringify(locations))}, function(err, files) {
              if (err) return done(err);

              console.log('Successfully wrote ' + locations.length + ' locations to SHAPEFILE');

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
        return locations.length == 0;
      },
      function(err) {
        console.log('done writing all locations for to SHAPEFILE', err);

        done(err);
      });
    }

    var generateZip = function(err, result) {
      if (err) return next(err);
      var zipFile = '/tmp/mage-shapefile-export-' + now.getTime() + '.zip';
      exec("zip -r " + zipFile + " " + req.directory + "/",
        function (err, stdout, stderr) {
          console.log('something bad happened', err);
          if (err !== null) {
            return next(err);
          }

          // stream zip to client
          var stream = fs.createReadStream(zipFile);
          stream.on('end', function() {
            // remove dir
            fs.remove(req.directory, function(err) {
              if (err) console.log('could not remove shapfile dir', req.directory);
            });

            // remove zip file
            fs.remove(zipFile, function(err) {
              if (err) console.log('could not remove shapfile zip', zipFile);
            });
          });

          var stat = fs.statSync(zipFile);

          res.type('application/zip');
          res.attachment(zipFile);
          res.header('Content-Length', stat.size)
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

  var exportKML = function(req, res, next) {
    var event = req.event;

    var streamObservations = function(stream, done) {
      if (!req.parameters.filter.exportObservations) return done(null, []);

      var filter = req.parameters.filter;
      filter.states = ['active'];
      new api.Observation(event).getAll({filter: filter}, function(err, observations) {
        Icon.getAll({eventId: event._id}, function(err, icons) {
          kmlStream.write(generate_kml.generateStyles(event, icons));
          stream.write(generate_kml.generateKMLFolderStart(event.name, false));

          observations.forEach(function(o) {
            mapObservations(o, req);
            stream.write(generate_kml.generatePlacemark(o.properties.type, o, event));
          });

          stream.write(generate_kml.generateKMLFolderClose());

          done();
        });
      });
    }

    var streamUserLocations = function(stream, user, done) {
      console.log('writing locations for user ' + user.username);

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;

      var lastLocationId = null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, {startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, userId: user._id}, function(err, requestedLocations) {
          if (err) return done(err);
          locations = requestedLocations;

          if (!lastLocationId && locations.length) { // first time through
            stream.write(generate_kml.generateKMLFolderStart('user: ' + user.username, false));
          }

          locations.forEach(function(location) {
            stream.write(generate_kml.generatePlacemark('FFT', location));
          });

          console.log('Successfully wrote ' + locations.length + ' locations to KML for user ' + user.username);
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
        return locations.length == 0;
      },
      function(err) {
        if (lastLocationId) { // if we got at least one location
          stream.write(generate_kml.generateKMLFolderClose());
        }
        console.log('done writing all locations for ' + user.username);
        done(err);
      });
    }

    res.type('application/zip');
    res.attachment('mage-export-kml.zip');
    res.cookie("fileDownload", "true", {path: '/'});

    //Known bug in Google Earth makes embedded images from a kmz file not render properly.  Treating
    //it as a zip file for now.
    var archive = archiver('zip');
    archive.pipe(res);
    var kmlStream = new stream.P***REMOVED***Through();
    archive.append(kmlStream, { name:'mage-export/mage-export.kml' });

    kmlStream.write(generate_kml.generateKMLHeader());
    kmlStream.write(generate_kml.generateKMLDocument());
    async.series([
      function(done) {
        if (!req.parameters.filter.exportObservations) return done();

        streamObservations(kmlStream, function(err) {
          // throw in attachments
          archive.bulk([{
            cwd: path.join(config.server.attachment.baseDirectory, event.collectionName),
            src: ['*/**'],
            dest: 'mage-export/attachments/' + event.collectionName,
            expand: true,
            data: { date: new Date() } }
          ]);

          // throw in icon
          archive.bulk([{
            cwd: new api.Icon(event._id).getBasePath(),
            src: ['**'],
            dest: 'mage-export/icons/' + event._id,
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
        console.log(err);
      }

      kmlStream.write(generate_kml.generateKMLDocumentClose());
      kmlStream.end(generate_kml.generateKMLClose());

      archive.finalize();
    });
  }

  var exportGeoJSON = function(req, res, next) {
    var event = req.event;
    var now = new Date();

    var streamFeatures = function(stream, done) {
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

    var streamLocations = function(stream, done) {
      console.log('writing locations...');
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

          console.log('Successfully wrote ' + locations.length + ' locations to GeoJSON');
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
        return locations.length == 0;
      },
      function(err) {
        console.log('done writing locations');
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

        var observationStream = new stream.P***REMOVED***Through();
        archive.append(observationStream, { name:'mage-export/observations.geojson' });
        streamFeatures(observationStream, function(err) {
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

        var locationStream = new stream.P***REMOVED***Through();
        archive.append(locationStream, {name: 'mage-export/locations.geojson'});
        streamLocations(locationStream, function(err) {
          locationStream.end();

          done();
        });
      }
    ],
    function(err) {
      if (err) {
        console.log(err);
      }

      archive.finalize();
    });
  }

  var exportCsv = function(req, res, next) {
    var event = req.event;
    var now = new Date();

    var streamFeatures = function(stream, done) {
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

    var streamLocations = function(stream, done) {
      console.log('writing locations...');
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

          console.log('Successfully wrote ' + locations.length + ' locations to GeoJSON');
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
        return locations.length == 0;
      },
      function(err) {
        console.log('done writing locations');
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

        var observationStream = new stream.P***REMOVED***Through();
        archive.append(observationStream, { name:'mage-export/observations.geojson' });
        streamFeatures(observationStream, function(err) {
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

        var locationStream = new stream.P***REMOVED***Through();
        archive.append(locationStream, {name: 'mage-export/locations.geojson'});
        streamLocations(locationStream, function(err) {
          locationStream.end();

          done();
        });
      }
    ],
    function(err) {
      if (err) {
        console.log(err);
      }

      archive.finalize();
    });
  }
}
