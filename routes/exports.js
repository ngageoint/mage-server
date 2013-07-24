module.exports = function(app, auth) {
  var moment = require('moment')
    , Location = require('../models/location')
    , Layer = require('../models/layer')
    , Feature = require('../models/feature')
    , access = require('../access')
    , generate_kml = require('../utilities/generate_kml')
    , async = require('async');

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

      if(!filterExportLayers && !filterFft) {        
        return res.send(400, "Error.  Please Select Layer for Export.");
      }

      async.series([

        //FUNCTION 1
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
        //FUNCTION 1 END

        //FUNCTION 2
        function(done) {   
          
          if(!filterExportLayers) {
            return done();
          }

          //get features for lookup
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
          //END get features for lookup
        },
        //FUNCTION 2 END
        
        //FUNCTION 3
        function(done) {
          //FFT
          Location.getLocationsWithFilters(req.user, filterTime, 10, function(err, locationResponse) { 
            if(err) {
              console.log(err);
              return done(err);
            }
            userLocations = locationResponse;
            done();
          });
          //FFT
        }
        //FUNCTION 3 END        
      ],

      //SERIES FUNCTION...EVERYTHING ELSE IS DONE
      function(err) {
        if(err) {
          console.log(err);
          return done(err);
        }       

        res.writeHead(200,{"Content-Type": "application/vnd.google-earth.kml+xml" , 
                           "Content-Disposition": "attachment; filename=MAGE-export.kml"});

        res.write(generate_kml.generateKMLHeader());
        res.write(generate_kml.generateKMLDocument());

        //writing requested feature layers
        if(filterExportLayers) {

          var exportLayerIds = filterExportLayers.split(',');
          for(var i in exportLayerIds) {
            
            var layerId = exportLayerIds[i];
            var layer = layerLookup[layerId];
            var features = featuresLookup[layerId];
            
            if(layer) {
              res.write(generate_kml.generateKMLFolderStart(layer.name));              
              for(var j in features) {
                feature = features[j];
                lon = feature.geometry.coordinates[0];
                lat = feature.geometry.coordinates[1];
                desc = feature.properties.TYPE;
                res.write(generate_kml.generatePlacemark(feature._id, feature.properties.TYPE, lon ,lat ,0, desc));
              }  
              res.write(generate_kml.generateKMLFolderClose());  
            }  
          }
        }

        //writing requested FFT locations
        if(filterFft) {
          for(var i in userLocations) {          
            var user = userLocations[i];
            res.write(generate_kml.generateKMLFolderStart('user: ' + user.user));
            for(var j in user.locations) {
              var location = user.locations[j];
              if(location) {
                lon = location.geometry.coordinates[0];
                lat = location.geometry.coordinates[1];
                desc = location.properties.createdOn;
                res.write(generate_kml.generatePlacemark('point' + j, 'FFT' , lon ,lat ,0, desc)); 
              } 
            }
            res.write(generate_kml.generateKMLFolderClose());  
          }
        }
        res.write(generate_kml.generateKMLDocumentClose());
        res.end(generate_kml.generateKMLClose()); 
      });
     //END SERIES FUNCTION...EVERYTHING ELSE IS DONE

    }
  );
          
}