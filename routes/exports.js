module.exports = function(app, auth) {
  var moment = require('moment')
    , Location = require('../models/location')
    , Layer = require('../models/layer')
    , Feature = require('../models/feature')
    , access = require('../access')
    , generate_kml = require('../utilities/generate_kml')
    , async = require('async')
    , fs = require('fs')
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

      var filterTime = req.query.time_filter;
      var filterExportLayers = req.query.export_layers;
      var filterFft = req.query.fft_layer;

      var currentDate = new Date();
      var currentTmpDir = "/tmp/mage-export-" + currentDate.getTime();

      if(!filterExportLayers && !filterFft) {        
        return res.send(400, "Error.  Please Select Layer for Export.");
      }

      //BEGIN SERIES FUNCTIONS
      async.series([

        //SERIES FUNCTION 1: Get layers for lookup
        function(done) {
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
          //END get layers for lookup
        },

        //SERIES FUNCTION 2: Get features for lookup
        function(done) {   
          
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
        },

        //SERIES FUNCTION 3: Get locations for KML export
        function(done) {
          //FFT
          Location.getLocationsWithFilters(req.user, filterTime, 100000, function(err, locationResponse) { 
            if(err) {
              console.log(err);
              return done(err);
            }
            userLocations = locationResponse;
            done();
          });
          //FFT
        },
        
        //SERIES FUNCTION 4: Make tmp staging directory.
        function(done) {
          child = exec("mkdir -p " + currentTmpDir + "/icons", function (error, stdout, stderr) {
            sys.print('stdout: ' + stdout);
            sys.print('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
            done();
          });
        },

        //SERIES FUNCTION 5: Copy kml-icons to staging area.
        function(done) {
          child = exec("cp public/img/kml-icons/*.png  " + currentTmpDir + "/icons", function (error, stdout, stderr) {
            sys.print('stdout: ' + stdout);
            sys.print('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
            done();
          });
        },

        //SERIES FUNCTION 6: Write the actual KML.
        function(done) {

          var filename = "mage-export-" + currentDate.getTime() + ".kml"
          var stream = fs.createWriteStream(currentTmpDir + "/" + filename);
          stream.once('open', function(fd) {
              

            //res.writeHead(200,{"Content-Type": "application/vnd.google-earth.kml+xml" , 
            //                   "Content-Disposition": "attachment; filename=MAGE-export.kml"});    

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
                    stream.write(generate_kml.generatePlacemark(feature._id, feature.properties.TYPE, lon ,lat ,0, desc));
                  }  
                  stream.write(generate_kml.generateKMLFolderClose());  
                }  
              }
            }    

            //writing requested FFT locations
            if(filterFft) {
              for(var i in userLocations) {          
                var user = userLocations[i];
                stream.write(generate_kml.generateKMLFolderStart('user: ' + user.user));
                for(var j in user.locations) {
                  var location = user.locations[j];
                  if(location) {
                    lon = location.geometry.coordinates[0];
                    lat = location.geometry.coordinates[1];
                    desc = location.properties.createdOn;
                    stream.write(generate_kml.generatePlacemark('point' + j, 'FFT' , lon ,lat ,0, desc)); 
                  } 
                }
                stream.write(generate_kml.generateKMLFolderClose());  
              }
            }
            stream.write(generate_kml.generateKMLDocumentClose());
            stream.end(generate_kml.generateKMLClose()); 
            done();
          });
        },

        //SERIES FUNCTION 7: Create KMZ
        function(done) {
          child = exec("zip -r " + 
                       currentTmpDir + "/mage-export-" + currentDate.getTime() + ".kmz " + 
                       currentTmpDir + "/*", function (error, stdout, stderr) {
            sys.print('stdout: ' + stdout);
            sys.print('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
            done();
          });
        }
      ],

      //SERIES FUNCTION...EVERYTHING ELSE IS DONE
      function(err) {

        var filename = currentTmpDir + "/mage-export-" + currentDate.getTime() + ".kmz";

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

          res.writeHead(200,{"Content-Type": "application/vnd.google-earth.kml+xml" , 
                             "Content-Disposition": "attachment; filename=mage-export-" + currentDate.getTime() + ".kmz"}); 
          res.write(file,"binary");  
          res.end();  
        });
      });
    });}
    //END ASYNCH
  );

}