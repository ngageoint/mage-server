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
    , Zip = require('node-zip')
    , DOMParser = require('xmldom').DOMParser
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

  app.get(
    '/api/export',
    access.authorize('READ_FEATURE'),
    parseQueryParams,
    getLayers,
    mapUsers,
    mapDevices,
    function(req, res) {
      switch (req.parameters.type) {
        case 'shapefile':
          console.log('exporting shapefiles...');
          exportShapefile(req, res);
          break;
        case 'kml':
          console.log('exporting KML...');
          exportKML(req, res);
          break;
      }
    }
  );

  var exportShapefile = function(req, res, next) {
    var fft = req.parameters.filter.fft;

    var layersToShapefiles = function(done) {
      console.log('layer to shape');
      async.map(req.layers,
        function(layer, done) {
          Feature.getFeatures(layer, {filter: req.parameters.filter}, function(features) {
            features.forEach(function(feature) {
              if (req.users[feature.properties.userId]) feature.properties.user = req.users[feature.properties.userId].username;
              if (req.devices[feature.properties.deviceId]) feature.properties.device = req.devices[feature.properties.deviceId].uid;

              delete feature.properties.deviceId;
              delete feature.properties.userId;
            });

            shp.writeGeoJson({features: JSON.parse(JSON.stringify(features))}, function(err, files) {
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

      Location.getAllLocations({filter: req.parameters.filter}, function(err, locations) {
        locations.forEach(function(location) {
          if (req.users[location.properties.user]) location.properties.user = req.users[location.properties.user].username;
          if (req.users[location.properties.deviceId]) location.properties.device = req.users[location.properties.deviceId].uid;

          delete location.properties.deviceId;
        });

        shp.writeGeoJson({features: JSON.parse(JSON.stringify(locations))}, function(err, files) {
          done(err, {files: files});
        });
      });
    }

    var generateZip = function(err, result) {
      if (err) return next(err);

      var zip = new Zip();
      var folder = zip.folder('layers');

      // Add layer shapefiles to zip
      result.layers.forEach(function(layer) {
        for (type in layer.files) {
          var file = layer.files[type];
          folder.file(layer.layer.name + "_" + type + '.shp', file.shp.buffer, { binary: true });
          folder.file(layer.layer.name + "_" + type + '.shx', file.shx.buffer, { binary: true });
          folder.file(layer.layer.name + "_" + type + '.dbf', file.dbf.buffer, { binary: true });
          if (file.prj) folder.file(layer.layer.name + "_" + type + '.prj', file.prj);
        }
      });

      // Add location shapefiles to zip
      for (type in result.locations.files) {
        var file = result.locations.files[type];
        folder.file("Locations_" + type + '.shp', file.shp.buffer, { binary: true });
        folder.file("Locations_" + type + '.shx', file.shx.buffer, { binary: true });
        folder.file("Locations_" + type + '.dbf', file.dbf.buffer, { binary: true });
        if (file.prj) folder.file("Locations_" + type + '.prj', file.prj);
      }

      // Generate zip and send response
      var data = zip.generate({ type: 'string', compression: 'STORE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', "attachment; filename=mage-shapefile-export-" + new Date().getTime() + ".zip");
      res.write(data, "binary");  
      res.end();
    }

    async.parallel({
      layers: layersToShapefiles,
      locations: locationsToShapefiles
    }, generateZip);
  }

  var exportKML = function(req, res) {

    var userLocations;
    var layers = [];
    var usersLookup = {};

    var layerIds = req.parameters.filter.layerIds;
    var fft = req.parameters.filter.fft;

    var currentDate = new Date();
    var currentTmpDir = "/tmp/mage-export-" + currentDate.getTime();

    if(!layerIds && !fft) {        
      return res.send(400, "Error.  Please Select Layer for Export.");
    }
    
    ////////////////////////////////////////////////////////////////////
    //DEFINE SERIES FUNCTIONS///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    var getLayers = function(done) {
      //get layers for lookup
      Layer.getLayers({ids: layerIds || []}, function(err, result) {
        layers = result;
        done(err);
      });
    }

    var getUsers = function(done) {
      //get users for lookup
      User.getUsers(function (users) {      
        users.forEach(function(user) {
          usersLookup[user._id] = user;
        });

        done();
      });        
    }

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

    var getLocations = function(done) {
      if (!fft) return done();

      Location.getLocationsWithFilters(req.user, req.parameters.filter, 100000, function(err, locationResponse) { 
        if(err) {
          console.log(err);
          return done(err);
        }

        userLocations = locationResponse;
        done();
      });
    }

    var createStagingDirectory = function(done) {
      child = exec("mkdir -p " + currentTmpDir + "/icons", function (error, stdout, stderr) {
        sys.print('stdout: ' + stdout);
        sys.print('stderr: ' + stderr);
        if (error !== null) {
          console.log('exec error: ' + error);
        }
        done();
      });
    }

    var copyKmlIconsToStagingDirectory = function(done) {
      child = exec("cp -r public/img/kml-icons/*  " + currentTmpDir + "/icons", function (error, stdout, stderr) {
        sys.print('stdout: ' + stdout);
        sys.print('stderr: ' + stderr);
        if (error !== null) {
          console.log('exec error: ' + error);
        }
        done();
      });
    }

    var copyFeatureMediaAttachmentsToStagingDirectory = function(done) {
      
      layers.forEach(function(layer) {
        var features = layer.features;

        async.each(features, 
          function(feature, featureDone) {
            async.each(feature.attachments, 
              function(attachment, attachmentDone) {

              //create the directories if needed
              var dir = path.dirname(currentTmpDir + '/files/' + attachment.relativePath);
              fs.mkdirp(dir, function(err) {
                if (err) {
                  console.log('Could not create directory for file attachemnt for KML export', err);
                  return attachmentDone();
                }

                var src = '/var/lib/mage/attachments/' + attachment.relativePath;
                var dest = currentTmpDir + '/files/' + attachment.relativePath;
                fs.copy(src, dest, function(err) {
                  if (err) {
                    console.log('Could not copy file for KML export', err);
                  }

                  return attachmentDone();
                });

              });     
            },
            function(err) {
              featureDone();
            });
          },
          function(err) {
            done();
          }
        );
      });
    }

    var writeKmlFile = function(done) {
      var filename = "mage-export-" + currentDate.getTime() + ".kml"
      var stream = fs.createWriteStream(currentTmpDir + "/" + filename);
      stream.once('open', function(fd) {
            
        stream.write(generate_kml.generateKMLHeader());
        stream.write(generate_kml.generateKMLDocument());    

        //writing requested feature layers
        if (layers) {    
          layers.forEach(function(layer) {
            var features = layer.features;
              
            if (layer) {
              stream.write(generate_kml.generateKMLFolderStart(layer.name, false));

              features.forEach(function(feature) {             
                lon = feature.geometry.coordinates[0];
                lat = feature.geometry.coordinates[1];
                desc = feature.properties.TYPE;
                attachments = feature.attachments;              
                stream.write(generate_kml.generatePlacemark(feature.properties.TYPE, feature.properties.TYPE, lon ,lat ,0, feature.properties, attachments));
              });

              stream.write(generate_kml.generateKMLFolderClose());  
            }  
          });
        }    

        //writing requested FFT locations
        if (fft) {
          userLocations.forEach(function(userLocation) {       
            var user = usersLookup[userLocation.user];

            if (user) {
              stream.write(generate_kml.generateKMLFolderStart('user: ' + user.username, false));

              userLocation.locations.forEach(function(location) {
                if (location) {
                  lon = location.geometry.coordinates[0];
                  lat = location.geometry.coordinates[1];                  
                  stream.write(generate_kml.generatePlacemark(user.username, 'FFT' , lon ,lat ,0, location.properties)); 
                } 
              });

              stream.write(generate_kml.generateKMLFolderClose());  
            }

          });
        }

        stream.write(generate_kml.generateKMLDocumentClose());
        stream.end(generate_kml.generateKMLClose(), function(err) {
          if(err) {
            console.log(err);
          }
          done();
        });             
      });
    }

    //Known bug in Google Earth makes embedded images from a kmz file not render properly.  Treating
    //it as a zip file for now.
    var createKmz = function(done) {
      child = exec("zip -r " + 
                   currentTmpDir + "/mage-export-" + currentDate.getTime() + ".zip " + 
                   currentTmpDir + "/*", function (error, stdout, stderr) {
        sys.print('stdout: ' + stdout);
        sys.print('stderr: ' + stderr);
        if (error !== null) {
          console.log('exec error: ' + error);
        }
        done();
      });
    }

    var streamZipFileToClient = function(err) {
      
      var filename = currentTmpDir + "/mage-export-" + currentDate.getTime() + ".zip";

      fs.exists(filename, function(exists) {  
        if(!exists) {  
          res.writeHead(404, {"Content-Type": "text/plain"});  
          res.write("404 Not Found\n");  
          res.close();  
          return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {  
          if(err) {  
            res.writeHead(500, {"Content-Type": "text/plain"});  
            res.write(err + "\n");  
            res.close();  
            return;  
          }  

          res.writeHead(200,{"Content-Type": "application/zip" , 
                             "Content-Disposition": "attachment; filename=mage-kml-export-" + currentDate.getTime() + ".zip"}); 
          res.write(file,"binary");  
          res.end();  
        });
      });
    }
    ////////////////////////////////////////////////////////////////////
    //END DEFINE SERIES FUNCTIONS///////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    var seriesFunctions = [getLayers, 
                           getUsers,
                           getFeatures, 
                           getLocations, 
                           createStagingDirectory,
                           copyKmlIconsToStagingDirectory,
                           copyFeatureMediaAttachmentsToStagingDirectory,
                           writeKmlFile,
                           createKmz];
          
    async.series(seriesFunctions,streamZipFileToClient);

  }

  app.get(
    '/api/import',
    function(req, res, next) {
      fs.readFile('/tmp/sochi/road/1_5/doc.kml', 'utf8', function(err, data) {
        if (err) return next(err);

        var featureCollections = toGeoJson.kml(data);
        // TODO use async here to get rid of nested callbacks
        featureCollections.forEach(function(featureCollection) {
          var layer = {
            name: featureCollection.name,
            type: 'External'
          };
          Layer.create(layer, function(err, newLayer) {
            if (err) {
              console.log('error creating layer', err);
              return;
            }

            featureCollection.featureCollection.features.forEach(function(feature) {
              Feature.createGeoJsonFeature(newLayer, feature, function(err, newFeature) {
                if (err) next(err);
              });
            });
          });
        });


        fs.writeFileSync('/tmp/sochi.json', JSON.stringify(featureCollections, null, 4));
        // console.log("done wrinting");
        res.send(200);
      });
    }
  );

}