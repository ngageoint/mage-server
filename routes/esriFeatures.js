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

      // TODO this needs to be dynamic depending on what people are inserting
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

    var features = function() {
      return content;
    }

    return {
      add : add,
      features : features
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

    var attachments = function() {
      return content;
    }

    return {
      add: add,
      attachments: attachments
    }
  }

  var getAttachmentDir = function(layer) {
    return app.get('attachmentBase') + layer.collectionName + '/';
  }

  app.param(function(name, fn) {
    if (fn instanceof RegExp) {
      return function(req, res, next, val) {
        var captures;
        if (captures = fn.exec(String(val))) {
          req.params[name] = captures;
          next();
        } else {
          next('route');
        }
      }
    }
  });

  app.param('featureObjectId', /^\d+$/);

  // Grab the layer for any endpoint that uses featureObjectId
  app.param('featureObjectId', function(req, res, next, objectId) {
    var id = parseInt(objectId, 10);
    models.Feature.getFeatureByObjectId(req.layer, id, function(feature) {
      if (!feature) {
        res.json({
          error: {
            code: 404,
            message: 'Feature (ID: ' + id + ') not found',
            details: []
          }
        });
        return;
      }

      req.feature = feature;
      next();
    });
  });

  // Queries for ESRI Styled records built for the ESRI format and syntax
  app.get('/FeatureServer/:layerId/query', function (req, res) {
    console.log("SAGE ESRI Features GET REST Service Requested");

    // TODO ignore query parameters for now and reaturn all features.
    models.Feature.getFeatures(req.layer, function (features) {
      var esriFeatures = new EsriFeatures();
      features.forEach(function(feature) {
        esriFeatures.add(feature);
      });

      res.json(esriFeatures.features());
    });
  }); 

  // Gets one ESRI Styled record built for the ESRI format and syntax
  app.get('/FeatureServer/:layerId/:featureObjectId', function (req, res) {
    console.log("SAGE ESRI Features (ID) GET REST Service Requested");

    var esriFeatures = new EsriFeatures();
    esriFeatures.add(req.feature);
    res.send(esriFeatures.features());
  }); 

  // This function creates a new ESRI Style Feature 
  app.post('/FeatureServer/:layerId/addFeatures', function(req, res) {
    console.log("SAGE ESRI Features POST REST Service Requested");

    var features = req.param('features');
    if (!features) {
      //TODO need common cl***REMOVED*** to house error object
      res.json({
        error: {
          code: 400,
          message: "Cannot add features. Invalid parameters.",
          details: ["'features' param not specified"]
        }
      });
      return;
    }

    features = JSON.parse(features);
    models.Feature.createFeatures(req.layer, features, function(features) {
      var response = {
        addResults: []
      };

      features.forEach(function(feature) {
        response.addResults.push({
          objectId: feature.attributes.OBJECTID,
          globalId: null,
          success: true
        });
      });

      res.json(response);
    });
  });

  // This function will update a feature by the ID
  app.post('/FeatureServer/:layerId/updateFeatures', function (req, res) {
    console.log("SAGE Features (ID) UPDATE REST Service Requested");

    var features = req.param('features');
    if (!features) {
      //TODO need common cl***REMOVED*** to house error object
      res.json({
        error: {
          code:400,
          message: "Cannot add features. Invalid parameters.",
          details: ["'features' param not specified"]
        }
      });
      return;
    }

    features = JSON.parse(features);
    var results = [];
    var onUpdate = function(err, feature, newFeature) {
      if (err || !newFeature) {
        results.push({
          objectId: feature.attributes.OBJECTID,
          globalId: null,
          success: false,
          error: {
            code: -1,
            description: 'Update for the object was not attempted. Object may not exist.'
          }
        });
      } else {
        results.push({
          objectId: newFeature.attributes.OBJECTID,
          globalId: null,
          success: true
        });
      }

      if (!features.length) {
        return res.json({updateResults: results});
      }

      models.Feature.updateFeature(req.layer, features.pop(), onUpdate);
    }

    if (features.length) {
      models.Feature.updateFeature(req.layer, features.pop(), onUpdate);
    } else {
      res.json({updateResults: results});
    }
  });

  app.post('/FeatureServer/:layerId/deleteFeatures', function(req, res) {
    console.log("SAGE ESRI Features (ID) Attachments DELETE REST Service Requested");

    var objectIds = req.param('objectIds');
    if (!objectIds) {
      //TODO need common cl***REMOVED*** to house error object
      res.json({
        error: {
          code:400,
          message: "Cannot delete features. Invalid parameters.",
          details: ["'objectIds' param not specified"]
        }
      });
      return;
    }

    // Convert to JS object
    objectIds = objectIds.split(",");
    for (element in objectIds) {
      objectIds[element] = parseInt(objectIds[element], 10);
    }

    var results = [];
    var onDelete = function(err, objectId, feature) {
      if (err || !feature) {
        results.push({
          objectId: objectId,
          globalId: null,
          success: false,
          error: {
            code: -1,
            description: 'Delete for the object was not attempted. Object may not exist.'
          }
        });
      } else {
        results.push({
          objectId: feature.attributes.OBJECTID,
          globalId: null,
          success: true
        });

        var path = getAttachmentDir(req.layer);
        feature.attachments.forEach(function(attachment) {
          fs.remove(path + attachment.name, function(err) {
            if (err) {
              console.error("Could not remove attachment file " + path + attachment.name + ". ", err);
            }
          });
        });
      }

      if (!objectIds.length) {
        return res.json({deleteResults: results});
      }

      models.Feature.removeFeature(req.layer, objectIds.pop(), onUpdate);
    }


    models.Feature.removeFeature(req.layer, objectIds.pop(), onDelete);
  });

  // This function gets all the attachments for a particular ESRI record  
  app.get('/FeatureServer/:layerId/:featureObjectId/attachments', function(req, res){
    console.log("SAGE ESRI Features (ID) Attachments GET REST Service Requested");

    var esriAttachments = new EsriAttachments();
    models.Feature.getAttachments(req.feature, function(attachments) {
      if (attachments) {
        attachments.forEach(function(attachment) {
          esriAttachments.add(attachment);
        });
      }

      res.json(esriAttachments.attachments());
    });
  });

  // This function gets a specific attachment for an ESRI feature 
  app.get('/FeatureServer/:layerId/:featureObjectId/attachments/:attachmentId', function(req, res){
    console.log("SAGE ESRI Features (ID) Attachments (ID) GET REST Service Requested");

    var attachmentId = req.params.attachmentId;

    models.Feature.getAttachment(req.feature, attachmentId, function(attachment) {
      if (!attachment) {
        var errorResponse = {
          error: {
            code: 404,
            message: 'Attachment (ID: ' + attachmentId + ') not found',
            details: []
          }
        };
        res.json(errorResponse);
        return;
      }

      var path = getAttachmentDir(req.layer);
      var file = fs.readFileSync(path + attachment.name);
      res.writeHead(200, {
        "Content-Type": attachment.contentType,
        "Content-Length": attachment.size,
        'Content-disposition': 'attachment; filename=' + attachment.name
       });
      res.end(file, 'binary');
    });
  });

  // This function will add an attachment for a particular ESRI record 
  app.post('/FeatureServer/:layerId/:featureObjectId/addAttachment', function(req, res, next) {
    console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

    var path = getAttachmentDir(req.layer);

    // move file upload to its new home
    fs.mkdirp(path, function(err) {
      if (err) return next(err);

      fs.rename(req.files.attachment.path, path + req.files.attachment.filename, function(err) {
        if (err) return next(err);

        models.Feature.addAttachment(req.feature, req.files, function(err, attachment) {
          if (err) return next(err);

          var response = {
            addAttachmentResult: {
              objectId: attachment ? attachment.id : -1,
              globalId: null,
              success: attachment ? true : false
            }
          };

          res.json(response);
        });
      });
    });

  });

  // This function will update the specified attachment for the given list of attachment ids
  // TODO test
  app.post('/FeatureServer/:layerId/:featureObjectId/updateAttachment', function(req, res, next) {
    console.log("SAGE ESRI Features (ID) Attachments UPDATE REST Service Requested");

    var attachmentId = req.param('attachmentId');
    if (!attachmentId) {
      return res.json({
        error: {
          code:400,
          message: "Cannot update attachment. Invalid parameters.",
          details: ["'attachmentId' param not specified"]
        }
      });
    }

    var attachmentId = parseInt(attachmentId, 10);

    // move file upload to its new home
    var path = getAttachmentDir(req.layer);
    fs.mkdirp(path, function(err) {
      if (err) return next(err);

      fs.rename(req.files.attachment.path, path + req.files.attachment.filename, function(err) {
        if (err) return next(err);

        models.Feature.updateAttachment(req.layer, attachmentId, req.files, function(err) {
          if (err) return next(err);

          res.json({
            updateAttachmentResult: {
              objectId: attachmentId,
              globalId: null,
              success: true
            }
          });
        });
      });
    });
  });

  // This function will delete all attachments for the given list of attachment ids
  app.post('/FeatureServer/:layerId/:featureObjectId/deleteAttachments', function(req, res) {
    console.log("SAGE ESRI Features (ID) Attachments DELETE REST Service Requested");

    var feature = req.feature;
    var attachments = req.param('attachmentIds');
    if (!attachments) {
      return res.json({
        error: {
          code:400,
          message: "Cannot delete attachments. Invalid parameters.",
          details: ["'attachmentIds' param not specified"]
        }
      });
    }

    // Convert to JS object
    var attachmentIds = attachments.split(",");
    for (element in attachmentIds) {
      attachmentIds[element] = parseInt(attachmentIds[element], 10);
    }

    var attachments = req.feature.attachments.toObject();

    models.Feature.removeAttachments(req.feature, attachmentIds, function(err) {
      var deleteResults = [];
      attachmentIds.forEach(function(attachmentId) {
        deleteResults.push({
          objectId: attachmentId,
          globalId: null,
          success: true
        });
      });

      res.json({deleteAttachmentResults: deleteResults});

      if (!err) {
        var path = getAttachmentDir(req.layer);
        attachments.forEach(function(attachment) {
          var index = attachmentIds.indexOf(attachment.id);
          if (index != -1) {
            fs.remove(path + attachment.name, function(err) {
              if (err) {
                console.error("Could not remove attachment file " + path + attachment.name + ". ", err);
              }
            });
          }
        });
      }
    });
  });
}