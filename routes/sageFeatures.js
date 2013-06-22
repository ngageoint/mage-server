// feature routes
module.exports = function(app, models, auth) {
  var geometryFormat = require('../format/geoJsonFormat');

  var parseQueryParams = function(req, res, next) {
    var parameters = {};

    var properties = req.param('properties');
    if (properties) {
      parameters.properties = properties.split(",");
    }

    var bbox = req.param('bbox');
    if (bbox) {
      parameters.geometries = geometryFormat.parse('bbox', bbox);
    }

    var geometry = req.param('geometry');
    if (geometry) {
      parameters.geometries = geometryFormat.parse('geometry', geometry);
    }

    req.parameters = parameters;

    next();
  }

  // Queries for ESRI Styled records built for the ESRI format and syntax
  app.get('/FeatureServer/:layerId/features', parseQueryParams, function (req, res) {
    console.log("SAGE ESRI Features GET REST Service Requested");

    // create filters for feature query
    var filters = null;

    var geometries = req.parameters.geometries;
    if (geometries) {
      filters = [];
      geometries.forEach(function(geometry) {
        filters.push({
          geometry: geometry
        });
      });
    }

    var respond = function(features) {
      var response = transformers.geojson.transform(features, req.parameters.properties);
      res.json(response);
    }

    if (filters) {
      allFeatures = [];
      async.each(
        filters, 
        function(filter, done) {
          models.Feature.getFeatures(req.layer, filter, function (features) {
            if (features) {
              allFeatures = allFeatures.concat(features);
            }

            done();
          });
        },
        function(err) {
          respond(allFeatures);
        }
      );
    } else {
      var filter = {};
      models.Feature.getFeatures(req.layer, filter, function (features) {
        respond(features);
      });
    }
  });

  // This function gets one feature with universal JSON formatting  
  app.get('/featureServer/v1/features/:id', function (req, res) {
    console.log("SAGE Features (ID) GET REST Service Requested");
    
    // get format parameter, default to json if not present
    var format = req.param('f', 'json');

    models.Feature.getFeatureById(req.params.id, function(feature) {
      var response = {};
      var formatter = Formatter(format);
      if (feature) {
        response = formatter.format(feature);
      }

      res.send(JSON.stringify(response));
    });
  }); 

  // This function creates a new Feature  
  app.post('/featureServer/v1/features', function (req, res) {
    console.log("SAGE Features POST REST Service Requested");

    var data = JSON.parse(req.query.features);
    models.Feature.createFeature(data[0], function(err, feature) {
      var response = {};
      if (feature) {
        response = feature;
      } 

      res.send(JSON.stringify(feature));
    });
  }); 


  // This function will update a feature by the ID
  app.put('/featureServer/v1/features/:id', function (req, res) {
    console.log("SAGE Features (ID) UPDATE REST Service Requested");
    
    var features = JSON.parse(req.query.features);
    models.Feature.updateFeature(features[0].attributes, function(err, feature) {
      var response = {};
      if (feature) {
        response = feature;
      }

      res.send(JSON.stringify(response));
    });
  }); 

  // TODO implement delete feature
  // This function deletes one feature based on ID
  // app.delete('/featureServer/v1/features/:id', function (req, res) {
  //   console.log("SAGE Features (ID) DELETE REST Service Requested");
  // }); 

  // TODO this should just be a param on GET features
  // Get Map Points in JSON format
  // app.get('/api/v1/featureMapPointsJSON', function (req, res){
  //   console.log("SAGE Get Feature Map Points REST Service Requested");
    
  //   models.Feature.getFeatures(function (features) {
      
  //     console.log(JSON.stringify(features));

  //     var mapStringBegin = "{\"features\": [";
  //     var mapStringEnd = "]}";
  //     var fullString = "";
  //     var indGeometry = "";
  //     var indAttributes = "";
      
  //     fullString = mapStringBegin;
      
  //     var count = 0;

  //     if(!features.length) {
  //       console.log("No records were found.");
  //       return res.send("{\"objectIdFieldName\": \"OBJECTID\",\"globalIdFieldName\": \"\",\"features\": []}");  
        
  //     }
  //     else {
  //       features.forEach( function(allMapPoints) {
          
  //         count = count + 1;
          
  //         mapPoint = "\"geometry\": {" +  allMapPoints.geometry.x + ", " + allMapPoints.geometry.y + "}";
          
  //         if (count < features.length) {
  //           fullString = fullString + ", ";
  //         }
  //       })
          
  //       fullString = fullString + mapStringEnd;
      
  //       return res.send(fullString);
  //     };
  //   });

  // });

  // This function will update a feature by the ID
  app.put('/api/v1/features/', function (req, res){
    console.log("SAGPut Random");
    
    return models.FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
      
      features.forEach( function(allMapPoints) {
      
        var x=Math.floor((Math.random()*42) + 81);
        var y=Math.floor((Math.random()*14) + 30);

        feature.geometry.x = x;
        feature.geometry.y = y;
      
      })
      
      return feature.save(function (err) {
        if (!err) {
          console.log("updated");
        } else {
          console.log(err);
        }
      return res.send(feature);
      });
    });
  });

  // TODO this should just be a param on GET features
  // // Gets all the features with universal JSON formatting   
  // app.get('/api/v1/getIDs', function (req, res){
  //   console.log("SAGE Get IDs GET REST Service Requested");

  //   return models.FeatureModel.find({}, {'_id': 0, 'attributes.OBJECTID': 1}, function (err, features) {
      

  //     var fullString = "{\"object_ids\": [";
  //     var object_ids = "";
      
  //     var count = 0;

  //     if( err || !features.length) {
  //       console.log("No records were found.");  
  //       return res.send("No records were found.");
  //     }
  //     else {
        
  //       features.forEach( function(allESRIRecords) {
          
  //         count = count + 1;
                  
  //         object_ids = "{ \"OBJECTID\": " + allESRIRecords.attributes.OBJECTID + "}";
          
  //         fullString = fullString + object_ids;
          
  //         if (count < features.length) {
  //           fullString = fullString + ", ";
  //         }     
  //       })
          
  //       fullString = fullString + "]}";
      
  //       return res.send(fullString);
  //     };
  //   });
  // });
}