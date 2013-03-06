// feature routes
module.exports = function(app, models, fs) {

  var Formatter = function(format) {
    return format == 'geojson' ? new GeoJsonFormatter() : new JsonFormatter();
  }

  function  JsonFormatter() {
    var format = function(data) {
      return data;
    }

    return {
      format: format
    }
  }

  function GeoJsonFormatter() {

    var transformFeature = function(feature) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [feature.geometry.x, feature.geometry.y]
        },
        properties: {
          id: feature._id,
          eventtype: feature.attributes.TYPE,
          eventlevel: feature.attributes.EVENTLEVEL,
          eventclear: feature.attributes.EVENTCLEAR,
          eventdate: feature.attributes.EVENTDATE,
          description: feature.attributes.DESCRIPTION,
          address: feature.attributes.ADDRESS,
          team: feature.attributes.TEAM,
          unit: feature.attributes.UNIT,
          usng: feature.attributes.USNG
        }
      }
    }

    var format = function(data) {
      var result;

      if (data instanceof Array) {
        result = {
          type: 'FeatureCollection',
          features: []
        }

        data.forEach(function(feature) {
          result.features.push(transformFeature(feature));
        });
      } else {
        result = transformFeature(data);
      }

      return result;
    }

    return {
      format: format
    }
  }

  // Gets all the features with universal JSON formatting   
  app.get('/featureServer/v1/features', function (req, res){
    console.log("SAGE Features GET REST Service Requested");

    // get format parameter, default to json if not present
    var format = req.param('f', 'json');

    models.Feature.getFeatures(function (features) {
      var response = [];
      var formatter = Formatter(format);
      if (features) {
        response = formatter.format(features);
      }

      res.send(JSON.stringify(response));
    });
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