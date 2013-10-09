// feature routes
module.exports = function(app, auth) {
  // TODO at one point thought is was a good idea to provide non ESRI
  // endpoints to MAGE.  Probably still a good idea just got caught up
  // in tight schedule and did not get the opportunity to all the routes in.

  var api = require('../api')
    , util = require('util')
    , moment = require('moment')
    , access = require('../access')
    , geometryFormat = require('../format/geoJsonFormat');

  var geojson = require('../transformers/geojson');

  var parseQueryParams = function(req, res, next) {
    var parameters = {filter: {}};

    var fields = req.param('fields');
    if (fields) {
      parameters.fields = JSON.parse(fields);
    }

    var startTime = req.param('startTime');
    if (startTime) {
      parameters.filter.startTime = moment.utc(startTime).toDate();
    }

    var endTime = req.param('endTime');
    if (endTime) {
      parameters.filter.endTime = moment.utc(endTime).toDate();
    }

    var bbox = req.param('bbox');
    if (bbox) {
      parameters.filter.geometries = geometryFormat.parse('bbox', bbox);
    }

    var geometry = req.param('geometry');
    if (geometry) {
      parameters.filter.geometries = geometryFormat.parse('geometry', geometry);
    }

    req.parameters = parameters;

    next();
  }

  // Queries for ESRI Styled records built for the ESRI format and syntax
  app.get(
    '/FeatureServer/:layerId/features',
    access.authorize('READ_FEATURE'),
    parseQueryParams, 
    function (req, res) {
      console.log("MAGE ESRI Features GET REST Service Requested");

      var options = {
        filter: req.parameters.filter,
        fields: req.parameters.fields
      }
      new api.Feature(req.layer).getAll(options, function(features) {
        var response = geojson.transform(features);
        res.json(response);
      });
    }
  );

  // This function gets one feature with universal JSON formatting  
  app.get('/FeatureServer/:layerId/features/:id', function (req, res) {
    console.log("MAGE Features (ID) GET REST Service Requested");
    
    new api.Feature(req.layer).getById(req.param('id'), function(feature) {
      var response = geojson.transform(feature);
      res.json(response);
    });
  }); 

  // This function creates a new Feature
  // TODO test
  app.post('/FeatureServer/:layerId/features', function (req, res) {
    console.log("MAGE Features POST REST Service Requested");

    var feature = req.body;
    new api.Feature(req.layer).create(feature, function(newFeature) {
      var response = geojson.transform(newFeature);
      res.json(response);
    });
  }); 


  // This function will update a feature by the ID
  // TODO test
  app.put('/FeatureServer/:layerId/features/:id', function (req, res) {
    console.log("MAGE Features (ID) UPDATE REST Service Requested");

    var feature = req.body;
    new api.Feature(req.layer).update(req.param('id'), req.body, function(err, updatedFeature) {
      var response = geojson.transform(updatedFeature);
      res.json(response);
    });
  }); 

  // This function deletes one feature based on ID
  // TODO test
  app.delete('/FeatureServer/:layerId/features/:id', function (req, res) {
    console.log("MAGE Features (ID) DELETE REST Service Requested");

    new api.Feature(req.layer).delete(req.param('id'), function(err, deletedFeature) {
      var response = geojson.transform(deletedFeature);
      res.json(response);
    });
  }); 

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

  // // This function will update a feature by the ID
  // app.put('/api/v1/features/', function (req, res){
  //   console.log("SAGPut Random");
    
  //   return FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
      
  //     features.forEach( function(allMapPoints) {
      
  //       var x=Math.floor((Math.random()*42) + 81);
  //       var y=Math.floor((Math.random()*14) + 30);

  //       feature.geometry.x = x;
  //       feature.geometry.y = y;
      
  //     })
      
  //     return feature.save(function (err) {
  //       if (!err) {
  //         console.log("updated");
  //       } else {
  //         console.log(err);
  //       }
  //     return res.send(feature);
  //     });
  //   });
  // });

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