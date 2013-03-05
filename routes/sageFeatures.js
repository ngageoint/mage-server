// feature routes
module.exports = function(app, models, fs) {

  // Gets all the features with universal JSON formatting   
  app.get('/api/v1/features', function (req, res){
    console.log("SAGE Features GET REST Service Requested");
    return models.FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
      if( err || !features.length) {
        console.log("No records were found.");  
        return res.send("No records were found.");
      }
      else {
        return res.send(features);
      };
    });
  });

  // This function gets one feature with universal JSON formatting  
  app.get('/api/v1/features/:id', function (req, res){
    console.log("SAGE Features (ID) GET REST Service Requested");
    
    return models.FeatureModel.findOne({
       "attributes.OBJECTID": req.params.id
    },{
      '_id': 0, 
      'geometry': 1, 
      'attributes': 1
    }, 
    function (err, feature) {

    // THIS IS TO USE THE MONGO OBJECT IT //
    //return FeatureModel.findById(req.params.id, function (err, feature) {
      if (!err) {
        return res.send(feature);
      } else {
        return console.log(err);
      }
    });
  }); 

  // This function creates a new Feature  
  app.post('/api/v1/features', function (req, res){
    console.log("SAGE Features POST REST Service Requested");

        var newID;
        var maxID = 0;
        
    models.FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
      if (!err) {   
        // Gets the Max OBJECTID from the Features Table
        features.forEach( function(allESRIRecords) {
          if (maxID < allESRIRecords.attributes.OBJECTID) {
            maxID = allESRIRecords.attributes.OBJECTID
          }
        });
        
        newID = maxID + 1;
        
        //return res.send(""+maxID);
        
      } else {
        return res.send(err);
      };
    }); 
    
    var feature;
    console.log("POST: ");
    console.log(req.body);
    
    feature = new models.FeatureModel({
      geometry: {
        x: req.body.x,
        y: req.body.y
      },
      attributes: {
        OBJECTID: maxID,  
        ADDRESS: req.body.ADDRESS,  
        EVENTDATE: req.body.EVENTDATE,  
        TYPE: req.body.TYPE,  
        EVENTLEVEL: req.body.EVENTLEVEL,  
        TEAM: req.body.TEAM, 
        DESCRIPTION: req.body.DESCRIPTION,  
        USNG: req.body.USNG,  
        EVENTCLEAR: req.body.EVENTCLEAR,
        UNIT: req.body.UNIT
      }

    });
    feature.save(function (err) {
      if (!err) {
        return console.log("Feature with ID: " + feature.id + " created.");
      } else {
        return console.log(err);
      }
    });
    return res.send(feature);
  }); 


  // This function will update a feature by the ID
  app.put('/api/v1/features/:id', function (req, res){
    console.log("SAGE Features (ID) UPDATE REST Service Requested");
    
    return models.FeatureModel.findById(req.params.id, function (err, feature) { 
      
      feature.geometry.x = req.body.x;
      feature.geometry.y = req.body.y;
      feature.attributes.OBJECTID = req.body.OBJECTID;
      feature.attributes.ADDRESS = req.body.ADDRESS;
      feature.attributes.EVENTDATE = req.body.EVENTDATE;  
      feature.attributes.TYPE = req.body.TYPE;  
      feature.attributes.EVENTLEVEL = req.body.EVENTLEVEL;
      feature.attributes.TEAM = req.body.TEAM;
      feature.attributes.DESCRIPTION = req.body.DESCRIPTION; 
      feature.attributes.USNG = req.body.USNG;
      feature.attributes.EVENTCLEAR = req.body.EVENTCLEAR;
      feature.attributes.UNIT = req.body.UNIT;
      
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

  // This function deletes one feature based on ID
  app.delete('/api/v1/features/:id', function (req, res){
    console.log("SAGE Features (ID) DELETE REST Service Requested");

    return models.FeatureModel.findById(req.params.id, function (err, feature) {
      return product.remove(function (err) {
        if (!err) {
          console.log("Feature with ID: " + req.params.id + " deleted.");
          return res.send('');
        } else {
          console.log(err);
        }
      });
    });
  }); 

  // Get Map Points in GeoJSON format
  app.get('/api/v1/featureMapPoints', function (req, res){
    console.log("SAGE Get Feature Map Points REST Service Requested");
    
    return models.FeatureModel.find({}, {'_id': 0}, function (err, features) {
      
      var mapStringBegin = "{\"type\": \"FeatureCollection\", \"features\": [";
      var mapStringEnd = "]}";
      var fullString = "";
      var indGeometry = "";
      var indAttributes = "";
      
      fullString = mapStringBegin;
      
      var count = 0;

      if( err || !features.length) {
        console.log("No records were found.");
        return res.send("{\"objectIdFieldName\": \"OBJECTID\",\"globalIdFieldName\": \"\",\"features\": []}");  
        
      }
      else {
        features.forEach( function(allMapPoints) {
          
          count = count + 1;
          
          mapPoint = "\"geometry\": { \"type\": \"Point\", \"coordinates\": [" + 
            allMapPoints.geometry.x + 
            ", " + 
            allMapPoints.geometry.y + 
            "]}, \"type\": \"Feature\", \"properties\": {" + 
            "\"eventtype\": \"" + allMapPoints.attributes.TYPE +
            "\", \"eventlevel\": \"" + allMapPoints.attributes.EVENTLEVEL +       
            "\", \"address\": \"" + allMapPoints.attributes.ADDRESS +
            "\", \"description\": \"" + allMapPoints.attributes.DESCRIPTION +
            "\", \"eventclear\": \"" + allMapPoints.attributes.EVENTCLEAR +
            "\", \"eventdate\": \"" + allMapPoints.attributes.EVENTDATE +
            "\", \"team\": \"" + allMapPoints.attributes.TEAM +
            "\", \"unit\": \"" + allMapPoints.attributes.UNIT +
            "\", \"usng\": \"" + allMapPoints.attributes.USNG +
            "\"}, \"id\": " + 
            allMapPoints.attributes.OBJECTID;
          
          fullString = fullString + "{" + mapPoint + "}";
          
          if (count < features.length) {
            fullString = fullString + ", ";
          }
        })
          
        fullString = fullString + mapStringEnd;
      
        return res.send(fullString);
      };
    });

  });

  // Get Map Points in JSON format
  app.get('/api/v1/featureMapPointsJSON', function (req, res){
    console.log("SAGE Get Feature Map Points REST Service Requested");
    
    return models.FeatureModel.find({}, {'_id': 0}, function (err, features) {
      
      var mapStringBegin = "{\"features\": [";
      var mapStringEnd = "]}";
      var fullString = "";
      var indGeometry = "";
      var indAttributes = "";
      
      fullString = mapStringBegin;
      
      var count = 0;

      if( err || !features.length) {
        console.log("No records were found.");
        return res.send("{\"objectIdFieldName\": \"OBJECTID\",\"globalIdFieldName\": \"\",\"features\": []}");  
        
      }
      else {
        features.forEach( function(allMapPoints) {
          
          count = count + 1;
          
          mapPoint = "\"geometry\": {" +  allMapPoints.geometry.x + ", " + allMapPoints.geometry.y + "}";
          
          if (count < features.length) {
            fullString = fullString + ", ";
          }
        })
          
        fullString = fullString + mapStringEnd;
      
        return res.send(fullString);
      };
    });

  });

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

  // Gets all the features with universal JSON formatting   
  app.get('/api/v1/getIDs', function (req, res){
    console.log("SAGE Get IDs GET REST Service Requested");

    return models.FeatureModel.find({}, {'_id': 0, 'attributes.OBJECTID': 1}, function (err, features) {
      

      var fullString = "{\"object_ids\": [";
      var object_ids = "";
      
      var count = 0;

      if( err || !features.length) {
        console.log("No records were found.");  
        return res.send("No records were found.");
      }
      else {
        
        features.forEach( function(allESRIRecords) {
          
          count = count + 1;
                  
          object_ids = "{ \"OBJECTID\": " + allESRIRecords.attributes.OBJECTID + "}";
          
          fullString = fullString + object_ids;
          
          if (count < features.length) {
            fullString = fullString + ", ";
          }     
        })
          
        fullString = fullString + "]}";
      
        return res.send(fullString);
      };
    });
  });
}