module.exports = function(app, auth) {
  var moment = require('moment')
    , Location = require('../models/location')
    , Layer = require('../models/layer')
    , User = require('../models/user')
    , Feature = require('../models/feature')
    , access = require('../access')
    , generate_kml = require('../utilities/generate_kml')
    , async = require('async')
    , fs = require('fs-extra')
    , sys = require('sys')
    , exec = require('child_process').exec;
;

  var p***REMOVED***port = auth.p***REMOVED***port;

// export locations into KML
  app.get(
    '/api/export',
    function(req, res) {

      var userLocations;
      var layerLookup = {};
      var featuresLookup = {};
      var usersLookup = {};

      var filterTime = req.query.time_filter;
      var filterExportLayers = req.query.export_layers;
      var filterFft = req.query.fft_layer;

      var currentDate = new Date();
      var currentTmpDir = "/tmp/mage-export-" + currentDate.getTime();

      if(!filterExportLayers && !filterFft) {        
        return res.send(400, "Error.  Please Select Layer for Export.");
      }
      
      ////////////////////////////////////////////////////////////////////
      //DEFINE SERIES FUNCTIONS///////////////////////////////////////////
      ////////////////////////////////////////////////////////////////////
      var getLayers = function(done) {
        //get layers for lookup
        Layer.getLayers(function (err, layers) {
          if(err) {
            console.log(err);
            return done(err);
          }
          for (var i in layers) {
            //layerLookup[layers[i].id] = layers[i];
            var layer = layers[i];
            layerLookup[layer.id] = layer;
          }
          done();
        });
      }

      var getUsers = function(done) {
        //get users for lookup
        User.getUsers(function (users){          
          for (var i in users) {            
            var user = users[i];
            usersLookup[user._id] = user;
          }
          done();
        });        
      }

      var getFeatures = function(done) {             
        if(!filterExportLayers) {
          return done();
        }
          
        var exportLayerIds = filterExportLayers.split(',');
        async.each(exportLayerIds, function(id, done){
          layer = layerLookup[id];
          Feature.getFeatures(layer, {}, function(featureResponse) {
            if(featureResponse) {              
              featuresLookup[id] = featureResponse;
              done();
            }
          });
        },
        function(){
          done();
        });                     
      }

      var getLocations = function(done) {      
        Location.getLocationsWithFilters(req.user, filterTime, 100000, function(err, locationResponse) { 
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
        
        console.log('Features Lookup: \n');
        
        Object.keys(featuresLookup).forEach(function(key) {
          
          var features = featuresLookup[key];

          for(var i = 0; i < features.length; i++) {
            var feature = features[i];
            var attachments = feature.attachments;
            if(attachments) {
              for(var j = 0; j < attachments.length; j++) {
                var attachment = attachments[j];
                
                //create the directories if needed
                child = exec('mkdir -p ' + currentTmpDir + '/files/' + attachment.relativePath, function (error, stdout, stderr) {
                  sys.print('stdout: ' + stdout);
                  sys.print('stderr: ' + stderr);
                  if (error !== null) {
                    console.log('exec error: ' + error);
                  }

                  //copy the file!
                  var srcFile = '/var/lib/mage/attachments' + attachment.relativePath;
                  var destFile = currentTmpDir + '/files/' + attachment.relativePath + '/' + attachment.name;
                  fs.copy(srcFile, destFile, function(err){
                    if(err) {
                      console.log('Unable to copy attachment. ' + err);
                    }
                  });

                });         
              }
            }
          }
        });
        done();
      }

      var writeKmlFile = function(done) {
        var filename = "mage-export-" + currentDate.getTime() + ".kml"
        var stream = fs.createWriteStream(currentTmpDir + "/" + filename);
        stream.once('open', function(fd) {
              
          stream.write(generate_kml.generateKMLHeader());
          stream.write(generate_kml.generateKMLDocument());    

          //writing requested feature layers
          if(filterExportLayers) {    

            var exportLayerIds = filterExportLayers.split(',');
            for(var i in exportLayerIds) {
                
              var layerId = exportLayerIds[i];
              var layer = layerLookup[layerId];
              var features = featuresLookup[layerId];
                
              if(layer) {
                stream.write(generate_kml.generateKMLFolderStart(layer.name));              
                for(var j in features) {
                  feature = features[j];
                  lon = feature.geometry.coordinates[0];
                  lat = feature.geometry.coordinates[1];
                  desc = feature.properties.TYPE;
                  attachments = feature.attachments;              
                  stream.write(generate_kml.generatePlacemark(feature._id, feature.properties.TYPE, lon ,lat ,0, feature.properties, attachments));
                }  
                stream.write(generate_kml.generateKMLFolderClose());  
              }  
            }
          }    

          //writing requested FFT locations
          if(filterFft) {
            for(var i in userLocations) {          
              var userLocation = userLocations[i];
              var user = usersLookup[userLocation.user];
              stream.write(generate_kml.generateKMLFolderStart('user: ' + user.username));
              for(var j in userLocation.locations) {
                var location = userLocation.locations[j];
                if(location) {
                  lon = location.geometry.coordinates[0];
                  lat = location.geometry.coordinates[1];                  
                  stream.write(generate_kml.generatePlacemark(user.username + "-p" + j, 'FFT' , lon ,lat ,0, location.properties)); 
                } 
              }
              stream.write(generate_kml.generateKMLFolderClose());  
            }
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

      var streamKmzFileToClient = function(err) {
        
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

            res.writeHead(200,{"Content-Type": "application/octet-stream" , 
                               "Content-Disposition": "attachment; filename=mage-export-" + currentDate.getTime() + ".zip"}); 
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
            
      async.series(seriesFunctions,streamKmzFileToClient);

    }
 
  );

}