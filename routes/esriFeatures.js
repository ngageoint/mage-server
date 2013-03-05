// ESRI feature routes
module.exports = function(app, models, fs) {

  function EsriFeatures() {
    var content = {
      'objectIdFieldName' : 'OBJECTID',
      'globalIdFieldName' : '',
      'features' : []
    };

    var createMetadata = function() {
      content.geometryType = 'esriGeometryPoint';
      content.spatialReference = { 'wkid' : 4326 };
      content.fields = [
        { name: 'OBJECTID', alias: 'OBJECTID', type: 'esriFieldTypeOID' },
        { name: 'ADDRESS', alias: 'ADDRESS', type: 'esriFieldTypeString', length: 255 },
        { name: 'EVENTDATE', alias: 'EVENTDATE', type: 'esriFieldTypeDate', length: 36 },
        { name: 'TYPE', alias: 'TYPE', type: 'esriFieldTypeString', length: 50 },
        { name: 'EVENTLEVEL', alias: 'LEVEL', type: 'esriFieldTypeString', length: 50 },
        { name: 'TEAM', alias: 'TEAM', type: 'esriFieldTypeString', length: 50 },
        { name: 'DESCRIPTION', alias: 'DESCRIPTION', type: 'esriFieldTypeString', length: 1073741822 },
        { name: 'USNG', alias: 'USNG', type: 'esriFieldTypeString', length: 255 },
        { name: 'EVENTCLEAR', alias: 'EVENTCLEAR', type: 'esriFieldTypeDate', length: 36 },
        { name: 'UNIT', alias: 'UNIT', type: 'esriFieldTypeString', length: 100 }
      ];
    }

    var add = function(feature) {
      if (!feature) return;

      // If we have added at least on feature create the metadata
      if (content.features.length == 0) {
        createMetadata();
      }

      content.features.push({
        geometry: { x: feature.geometry.x, y: feature.geometry.y },
        attributes: {
          OBJECTID: feature.attributes.OBJECTID,
          ADDRESS: feature.attributes.ADDRESS,
          EVENTDATE: feature.attributes.EVENTDATE,
          TYPE: feature.attributes.TYPE,
          EVENTLEVEL: feature.attributes.EVENTLEVEL,
          TEAM: feature.attributes.TEAM,
          DESCRIPTION: feature.attributes.DESCRIPTION,
          USNG: feature.attributes.USNG,
          EVENTCLEAR: feature.attributes.EVENTCLEAR,
          UNIT: feature.attributes.UNIT
        }
      });
    }

    var getResponse = function() {
      return JSON.stringify(content);
    }

    return {
      add : add,
      getResponse : getResponse
    }
  }

  function EsriAttachments() {
    var content = {
      attachmentInfos: []
    };

    var add = function(attachment) {
      if (!attachment) return;

      content.attachmentInfos.push({
        id: attachment.id,
        name: attachment.name,
        contentType: attachment.contentType,
        size: attachment.size
      });
    }

    var getResponse = function() {
      return JSON.stringify(content);
    }

    return {
      add: add,
      getResponse: getResponse
    }
  }

    // Gets the base API page
  app.get('/esriFeatureServer', function (req, res) {
    console.log("SAGE API GET REST Service Requested");

    var body = 
    '<html>'+
      '<head>'+
        '<meta http-equiv="Content-Type" content="text/html; '+
        'charset=UTF-8" />'+
        '<title>SAGE REST Services API Versions</title>'+
      '</head>'+
      '<body style="text-align:center">' +
        '<p><img src="images/sage_leaf.jpg" width="200" height="200" alt="Sage Leaves" /></p>' +
        '<p>You are looking at the base of the SAGE ESRI Feature Server (JSON).</p>' +
        '<p>The current version of the SAGE ESRI Feature Server is: &quot;v1&quot;</p>' +
        '<p><a href="/esriFeatureServer/v1">SAGE ESRI Feature Server v1</a></p>' +
        '<p>&nbsp;</p>' +
      '</body>' +
    '</html>';
    
    res.send(body);
  });

  // Gets the API versioning page
  app.get('/esriFeatureServer/v1', function (req, res) {
    console.log("SAGE APT V1 GET REST Service Requested");

    var body = 
    '<html>'+
      '<head>'+
      '<meta http-equiv="Content-Type" content="text/html; '+
      'charset=UTF-8" />'+
      '<title>SAGE REST Services API v1 Documentation</title>'+
    '</head>'+  
    '<body style="text-align: center;">'+
      '<p>http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/esriFeatureServer/v1/features/</p>'+
      '<p>GET</p>'+
      '<p>POST</p>'+
      '<p>http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/esriFeatureServer/v1/features/:featureId</p>'+
      '<p>PUT(update)</p>'+
      '<p>DELETE</p>'+
      '<p style="color: #F00;">http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/esriFeatureServer/v1/features/:id/addAttachment</p>'+
      '<p style="color: #F00;">http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/esriFeatureServer/v1/features/:id/deleteAttachment</p>'+
    '</body>' +
    '</html>';

    res.send(body);
  });

  // Gets all the ESRI Styled records built for the ESRI format and syntax
  app.get('/esriFeatureServer/v1/features/query', function (req, res){
    console.log("SAGE ESRI Features GET REST Service Requested");

    // TODO ignore query parameters for now and reaturn all features.
    models.Feature.getFeatures(function (features) {
      var esriFeatures = new EsriFeatures();
      features.forEach(function(feature) {
        esriFeatures.add(feature);
      });

      res.send(esriFeatures.getResponse());
    });
  }); 

  // Gets one ESRI Styled record built for the ESRI format and syntax
  app.get('/esriFeatureServer/v1/features/:id', function (req, res) {
    console.log("SAGE ESRI Features (ID) GET REST Service Requested");
    
    models.Feature.getFeature(req.params.id, function(feature) {
      if (!feature) {
        res.send(JSON.stringify({
          error: {
            code: 404,
            message: 'Feature (ID: ' + req.params.id + ') not found',
            details: []
          }
        }));
      }

      var esriFeatures = new EsriFeatures();
      esriFeatures.add(feature);
      res.send(esriFeatures.getResponse());
    });
  }); 

  // This function creates a new ESRI Style Feature 
  app.post('/esriFeatureServer/v1/features/addFeatures', function(req, res) {
    console.log("SAGE ESRI Features POST REST Service Requested");

    var data = JSON.parse(req.query.features);
    models.Feature.createFeature(data[0], function(err, feature) {
      var response = {
        updateResults: []
      };
      if (err || !feature) {
        response.updateResults.push({
          objectId: -1,
          globalId: null,
          success: false,
          error: {
            code: -1,
            description: 'Unable to create new feature.'
          }
        });
      } else {
        response.updateResults.push({
          objectId: feature.attributes.OBJECTID,
          globalId: null,
          success: true
        });
      }

      var response = JSON.stringify({
        addResults: [{
          objectId: feature.attributes.OBJECTID,
          globalId: null,
          success: true
        }]
      });

      console.log(response)
      res.send(response);
    });
  });

  // This function will update a feature by the ID
  app.post('/esriFeatureServer/v1/features/updateFeatures', function (req, res) {
    console.log("SAGE Features (ID) UPDATE REST Service Requested");

    var features = JSON.parse(req.query.features);
    models.Feature.updateFeature(features[0].attributes, function(err, feature) {
      var response = {
        updateResults: []
      };
      if (err || !feature) {
        response.updateResults.push({
          objectId: features[0].attributes.OBJECTID,
          globalId: null,
          success: false,
          error: {
            code: -1,
            description: 'Update for the object was not attempted. Object may not exist.'
          }
        });
      } else {
        response.updateResults.push({
          objectId: feature.attributes.OBJECTID,
          globalId: null,
          success: true
        });
      }

      var responseStr = JSON.stringify(response);
      console.log(responseStr)
      res.send(responseStr);
    });
  });

  // TODO implement delete feature
  // app.post('/api/v1/esri/deleteFeatures', function(req, res) {

  // });

  // This function gets all the attachments for a particular ESRI record  
  app.get('/esriFeatureServer/v1/features/:id/attachments', function(req, res){
    console.log("SAGE ESRI Features (ID) Attachments GET REST Service Requested");

    var esriAttachments = new EsriAttachments();
    models.Feature.getAttachments(req.params.id, function(attachments) {
      if (attachments) {
        attachments.forEach(function(attachment) {
          esriAttachments.add(attachment);
        });
      }

      res.send(esriAttachments.getResponse());
    });
  });

  // This function gets a specific attachment for an ESRI feature 
  app.get('/esriFeatureServer/v1/features/:featureId/attachments/:attachmentId', function(req, res){
    console.log("SAGE ESRI Features (ID) Attachments (ID) GET REST Service Requested");

    var featureId = req.params.featureId;
    var attachmentId = req.params.attachmentId;

    models.Feature.getAttachment(featureId, attachmentId, function(attachment) {
      if (!attachment) {
        var errorResponse = {
          error: {
            code: 404,
            message: 'Attachment (ID: ' + attachmentId + ') not found',
            details: []
          }
        };
        res.send(JSON.stringify(errorResponse));
        return;
      }

      console.log('WLN - found attachment: ' + JSON.stringify(attachment));

      var file = fs.readFileSync('/data/sage/uploads/' + attachment.name);
      res.writeHead(200, {
        "Content-Type": attachment.contentType,
        "Content-Length": attachment.size,
        'Content-disposition': 'attachment; filename=' + attachment.name
       });
      res.end(file, 'binary');
    });
  });

  // This function will add an attachment for a particular ESRI record 
  app.post('/esriFeatureServer/v1/features/:id/addAttachment', function(req, res) {
    console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

    fs.renameSync(req.files.attachment.path, "/data/sage/uploads/" + req.files.attachment.filename);

    var featureId = req.params.id;
    models.Feature.getFeature(featureId, function(feature) {
      if (!feature) {
        var response = JSON.stringify({
          addAttachmentResult: {
            objectId: -1,
            globalId: null,
            success: false,
            error: {
              code: -1,
              description: 'Feature (ID: ' + featureId + ') does not exist.'
            }
          }
        });

        console.log(response);
        res.send(response);

        return;
      } 

      models.Feature.addAttachment(feature, req.files, function(err, attachment) {
        var response = JSON.stringify({
          addAttachmentResult: {
            objectId: attachment ? attachment.id : -1,
            globalId: null,
            success: attachment ? true : false
          }
        });

        console.log(response);
        res.send(response);
      });
    });
  });

  // TODO implement
  // This function will delete all attachments for the given list of attachment ids
  // app.post('esriFeatureServer/v1/features/:id/updateAttachment', function(req, res) {

  // TODO not yet used, needs to be tested
  // This function will delete all attachments for the given list of attachment ids
  app.post('esriFeatureServer/v1/features/:id/deleteAttachments', function(req, res) {
    console.log("SAGE ESRI Features (ID) Attachments DELETE REST Service Requested");

    var response = {
      deleteAttachmentResults: []
    };

    req.params.attachmentIds.forEach(function(attachmentId) {
      models.Attachment.removeById(attachmentId, function(err, attachment) {
        if (err) {
          console.log('could not remove attachment ' + req.params.attachmentId + ' from database.')

          response.deleteAttachmentResults.push({
            objectId: attachmentId,
            globalId: null,
            success: false
          });
        } else {
          // Delete from file system
          var path = "/data/sage/uploads/" + attachment.name;
          fs.unlink(path, function(err) {
            if (err) {
              console.log('could not remove attachment ' + path + ' from file system.')
            }
          });

          response.deleteAttachmentResults.push({
            objectId: attachmentId,
            globalId: null,
            success: true
          });
        }
      });

      res.send(JSON.stringify(response));
    });
  });
}