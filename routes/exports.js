module.exports = function(app, security) {
  var moment = require('moment')
    , Location = require('../models/location')
    , Layer = require('../models/layer')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Feature = require('../models/feature')
    , access = require('../access')
    , generate_kml = require('../utilities/generate_kml')
    , async = require('async')
    , fs = require('fs-extra')
    , sys = require('sys')
    , path = require('path')
    , toGeoJson = require('../utilities/togeojson')
    , shp = require('shp-write')
    , DOMParser = require('xmldom').DOMParser
    , spawn = require('child_process').spawn
    , exec = require('child_process').exec;

  var parseQueryParams = function(req, res, next) {
    var parameters = {filter: {}};

    var type = req.param('type');
    if (!type) {
      return res.send(401, "You must choose a type");
    }
    parameters.type = type;

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
    User.getUsers(function (users) {
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
      filter.startDate = options.startDate.clone().add('milliseconds', 1).toDate();
    }
    if (options.endDate) {
      filter.endDate = options.endDate.toDate();
    }
    if(options.userId) {
      filter.userId = options.userId;
    }

    Location.getLocations({filter: filter, limit: 2000}, function(err, locations) {
      if(err) {
        console.log(err);
        return done(err);
      }

      done(null, locations);
    });
  }

  app.get(
    '/api/export',
    access.authorize('READ_FEATURE'),
    parseQueryParams,
    getLayers,
    mapUsers,
    mapDevices,
    createTmpDirectory,
    function(req, res, next) {
      switch (req.parameters.type) {
        case 'shapefile':
          console.log('exporting shapefiles...');
          exportShapefile(req, res, next);
          break;
        case 'kml':
          console.log('exporting KML...');
          exportKML(req, res, next);
          break;
      }
    }
  );

  var exportShapefile = function(req, res, next) {
    var fft = req.parameters.filter.fft;
    var now = new Date();

    var layersToShapefiles = function(done) {
      async.map(req.layers,
        function(layer, done) {
          Feature.getFeatures(layer, {filter: req.parameters.filter}, function(features) {
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
              if (!startDate || startDate.isBefore(locationTime) && locationTime.isBefore(Date.now())) {
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
    var userLocations;
    var layers = req.layers;
    var layerIds = req.parameters.filter.layerIds;
    var fft = req.parameters.filter.fft;

    var now = new Date();

    var getFeatures = function(done) {
      if(!layers) return done();

      async.each(layers, function(layer, done) {
        Feature.getFeatures(layer, {filter: req.parameters.filter}, function(features) {
          layer.features = features;
          done();
        });
      },
      function(){
        done();
      });
    }

    var copyKmlIcons= function(done) {
      fs.copy('public/img/kml-icons', req.directory + "/icons", function(err) {
        done(err);
      });
    }

    var copyFeatureMediaAttachmentsToStagingDirectory = function(done) {
      async.each(layers,
        function(layer, layerDone) {
          async.each(layer.features,
            function(feature, featureDone) {
              async.each(feature.attachments,
                function(attachment, attachmentDone) {
                  var src = '/var/lib/mage/attachments/' + attachment.relativePath;
                  var dest = req.directory + '/files/' + attachment.relativePath;
                  fs.copy(src, dest, function(err) {
                    if (err) {
                      console.log('Could not copy file for KML export', err);
                    }

                    return attachmentDone();
                  });
                },
                function(err) {
                  featureDone();
                }
              );
            },
            function(err) {
              layerDone();
            }
          );
        },
        function(err) {
          done();
        }
      );
    }

    var writeFeatures = function(stream, done) {
      //writing requested feature layers
      if (layers) {
        layers.forEach(function(layer) {
          var features = layer.features;

          if (layer) {
            stream.write(generate_kml.generateKMLFolderStart(layer.name, false));

            features.forEach(function(feature) {
              lon = feature.geometry.coordinates[0];
              lat = feature.geometry.coordinates[1];
              desc = feature.properties.type;
              attachments = feature.attachments;
              stream.write(generate_kml.generatePlacemark(feature.properties.type, feature.properties.type, lon ,lat ,0, feature.properties, attachments));
            });

            stream.write(generate_kml.generateKMLFolderClose());
          }
        });
      }

      done();
    }

    var writeUserLocations = function(stream, user, done) {
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
            stream.write(generate_kml.generatePlacemark(user.username, 'FFT' , location.geometry.coordinates[0] ,location.geometry.coordinates[1] ,0, location.properties));
          });

          console.log('Successfully wrote ' + locations.length + ' locations to KML for user ' + user.username);
          var last = locations.slice(-1).pop();
          if (last) {
            var locationTime = moment(last.properties.timestamp);
            lastLocationId = last._id;
            if (!startDate || startDate.isBefore(locationTime) && locationTime.isBefore(Date.now())) {
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

    var writeLocations = function(stream, done) {
      if (!fft) return done();

      async.eachSeries(Object.keys(req.users), function(userId, callback) {
        writeUserLocations(stream,  req.users[userId], callback);
      },
      function(err) {
        done(err);
      });
    }

    var writeKmlFile = function(done) {
      var filename = "mage-export.kml"
      var stream = fs.createWriteStream(req.directory + "/" + filename);
      stream.once('open', function(fd) {
        async.series([
          function(done) {
            stream.write(generate_kml.generateKMLHeader());
            stream.write(generate_kml.generateKMLDocument());
            done();
          },
          function(done) {
            writeFeatures(stream, done);
          },
          function(done) {
            writeLocations(stream, done);
          },
          function(done) {
            stream.write(generate_kml.generateKMLDocumentClose());
            done();
          }
        ],
        function(err) {
          stream.end(generate_kml.generateKMLClose(), function(err) {
            if(err) {
              console.log(err);
            }
            done();
          });
        });
      });
    }

    //Known bug in Google Earth makes embedded images from a kmz file not render properly.  Treating
    //it as a zip file for now.
    var streamZipFileToClient = function(err) {
      var zipFile = '/tmp/mage-kml-export-' + now.getTime() + '.zip';

      var zip = spawn('zip', ['-r', '-q', zipFile, req.directory], {stdio: [ 'ignore', 'ignore', 'ignore' ]});

      zip.on("exit", function (code) {
        console.log('done generating zip');

        if (code !== 0) {
          console.log('error generating zip, code: ' + code);
        }

        var stream = fs.createReadStream(zipFile);
        stream.on('end', function() {
          // remove dir
          fs.remove(req.directory, function(err) {
            if (err) console.log('could not remove KML dir', req.directory);
          });
          //remove zip file
          fs.remove(zipFile, function(err) {
            if (err) console.log('could not remove KML zip', zipFile);
          });
        });

        var stat = fs.statSync(zipFile);

        res.type('application/zip');
        res.attachment(zipFile);
        res.header('Content-Length', stat.size)
        res.cookie("fileDownload", "true", {path: '/'});
        stream.pipe(res);
      });

      var t = 32;
    }

    ////////////////////////////////////////////////////////////////////
    //END DEFINE SERIES FUNCTIONS///////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    async.series([
      getFeatures,
      copyKmlIcons,
      copyFeatureMediaAttachmentsToStagingDirectory,
      writeKmlFile
   ], streamZipFileToClient);
  }
}
