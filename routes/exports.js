module.exports = function(app, security) {
  var moment = require('moment')
    , config = require('../config')
    , api = require('../api')
    , Location = require('../models/location')
    , Layer = require('../models/layer')
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
    , exec = require('child_process').exec;

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

    var layerIds = req.param('layerIds');
    if (layerIds) {
      parameters.filter.layerIds = layerIds.split(',');
    }

    var fft = req.param('fft');
    if (fft) {
      parameters.filter.fft = fft === 'true';
    }

    if(!layerIds && !fft) {
      return res.send(400, "Error.  Please Select Layer for Export.");
    }

    req.parameters = parameters;

    next();
  }

  var getLayers = function(req, res, next) {
    //get layers for lookup
    Layer.getLayers({ids: req.parameters.filter.layerIds || []}, function(err, layers) {
      req.layers = layers;

      next(err);
    });
  }

  var mapUsers = function(req, res, next) {
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

  var mapDevices = function(req, res, next) {
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

  var createTmpDirectory = function(req, res, next) {
    var directory = "/tmp/mage-export-" + new Date().getTime();
    fs.mkdirp(directory, function(err) {
      req.directory = directory;
      next();
    });
  }

  var requestLocations = function(options, done) {
    var filter = {};
    if (options.lastLocationId) {
      filter.lastLocationId = options.lastLocationId;
    }
    if (options.startDate) {
      filter.startDate = options.startDate.toDate();
    }
    if (options.endDate) {
      filter.endDate = options.endDate.toDate();
    }
    if (options.userId) {
      filter.userId = options.userId;
    }

    Location.getLocations({filter: filter, limit: options.limit}, function(err, locations) {
      if(err) {
        console.log(err);
        return done(err);
      }

      done(null, locations);
    });
  }

  app.get(
    '/api/:exportType(geojson|kml|shapefile)',
    access.authorize('READ_FEATURE'),
    parseQueryParams,
    getLayers,
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
      }
    }
  );

  var exportShapefile = function(req, res, next) {
    var fft = req.parameters.filter.fft;
    var now = new Date();

    var layersToShapefiles = function(done) {
      var filter = req.parameters.filter;
      filter.states = ['active'];
      async.map(req.layers,
        function(layer, done) {
          new api.Feature(layer).getAll({filter: filter}, function(features) {
            features.forEach(function(feature) {
              if (req.users[feature.userId]) feature.properties.user = req.users[feature.userId].username;
              if (req.devices[feature.deviceId]) feature.properties.device = req.devices[feature.deviceId].uid;

              delete feature.deviceId;
              delete feature.userId;
            });

            var streams = {
              shp: fs.createWriteStream(req.directory + "/" + layer.name + ".shp"),
              shx: fs.createWriteStream(req.directory + "/" + layer.name + ".shx"),
              dbf: fs.createWriteStream(req.directory + "/" + layer.name + ".dbf"),
              prj: fs.createWriteStream(req.directory + "/" + layer.name + ".prj")
            };
            shp.writeGeoJson(streams, {features: JSON.parse(JSON.stringify(features))}, function(err, files) {
              done(err, {layer: layer, files: files});
            });
          });
        },
        function(err, results) {
          done(err, results);
        }
      );
    }

    var locationsToShapefiles = function(done) {
      if (!fft) return done(null, []);

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;
      var lastLocationId = null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId}, function(err, requestedLocations) {
          if (err) return done(err)
          locations = requestedLocations;

          console.log('got some locations ' + locations.length);

          locations.forEach(function(location) {
            if (req.users[location.properties.user]) location.properties.user = req.users[location.properties.user].username;
            if (req.users[location.properties.deviceId]) location.properties.device = req.users[location.properties.deviceId].uid;

            delete location.properties.deviceId;
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
      layers: layersToShapefiles,
      locations: locationsToShapefiles
    }, generateZip);
  }

  var exportKML = function(req, res, next) {
    var layers = req.layers;
    var layerIds = req.parameters.filter.layerIds;
    var fft = req.parameters.filter.fft;

    var streamFeatures = function(stream, done) {
      var filter = req.parameters.filter;
      filter.states = ['active'];
      async.each(layers, function(layer, done) {
        new api.Feature(layer).getAll({filter: filter}, function(features) {
          layer.features = features;
          // TODO redo based on event
          // Form.getById(layer.formId, function(err, form) {
          //   layer.form = form;
          //   Icon.getAll({formId: layer.form._id}, function(err, icons) {
          //     kmlStream.write(generate_kml.generateStyles(icons));
          //     stream.write(generate_kml.generateKMLFolderStart(layer.name, false));
          //
          //     features.forEach(function(feature) {
          //       stream.write(generate_kml.generatePlacemark(feature.properties.type, feature, layer.form));
          //     });
          //
          //     stream.write(generate_kml.generateKMLFolderClose());
          //
          //     done();
          //   });
          // });
        });
      },
      function(){
        done();
      });
    }

    var streamUserLocations = function(stream, user, done) {
      console.log('writing locations for user ' + user.username);

      var startDate = req.parameters.filter.startDate ? moment(req.parameters.filter.startDate) : null;
      var endDate = req.parameters.filter.endDate ? moment(req.parameters.filter.endDate) : null;

      var lastLocationId = null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, userId: user._id}, function(err, requestedLocations) {
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
        if (!layers.length) return done();

        streamFeatures(kmlStream, function(err) {
          layers.forEach(function(layer) {
            // throw in attachments
            archive.bulk([{
              cwd: path.join(config.server.attachment.baseDirectory, layer.collectionName),
              src: ['*/**'],
              dest: 'mage-export/attachments/' + layer.collectionName,
              expand: true,
              data: { date: new Date() } }
            ]);

            // throw in icons
            archive.bulk([{
              cwd: config.server.iconBaseDirectory,
              src: ['*/**'],
              dest: 'mage-export/icons',
              expand: true,
              data: { date: new Date() } }
            ]);

            done();
          });
        });
      },
      function(done) {
        if (!fft) return done();

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
    var userLocations;
    var layers = req.layers;
    var layerIds = req.parameters.filter.layerIds;
    var fft = req.parameters.filter.fft;

    var now = new Date();

    var streamFeatures = function(stream, done) {
      var filter = req.parameters.filter;
      filter.states = ['active'];
      async.each(layers, function(layer, done) {
        new api.Feature(layer).getAll({filter: filter}, function(features) {
          layer.features = features;
          // TODO redo based on event
          // Form.getById(layer.formId, function(err, form) {
          //   layer.form = form;
          //   stream.write(JSON.stringify({
          //     type: 'FeatureCollection',
          //     features: geojson.transform(layer.features)
          //   }));
          //
          //   done();
          // });
        });
      },
      function(){
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
        requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
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
        if (!layers.length) return done();

        var observationStream = new stream.P***REMOVED***Through();
        archive.append(observationStream, { name:'mage-export/observations.geojson' });
        streamFeatures(observationStream, function(err) {
          observationStream.end();

          layers.forEach(function(layer) {
            // throw in attachments
            archive.bulk([{
              cwd: path.join(config.server.attachment.baseDirectory, layer.collectionName),
              src: ['*/**'],
              dest: 'mage-export/attachments',
              expand: true,
              data: { date: new Date() } }
            ]);

            // throw in icons
            var iconPath = new api.Icon(layer.form._id).getBasePath();
            archive.bulk([{
              cwd: iconPath,
              src: ['*/**'],
              dest: 'mage-export/icons',
              expand: true,
              data: { date: new Date() } }
            ]);

            done();
          });
        });
      },
      function(done) {
        if (!fft) return done();

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
