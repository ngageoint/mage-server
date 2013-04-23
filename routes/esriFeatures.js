// ESRI feature routes
module.exports = function(app, models, fs, transformers, async, utilities) {
  var geo = utilities.geometry;

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

  var createAttachmentPath = function(layer, attachment) {
    var now = new Date();
    var path = [
      layer.collectionName, 
      now.getFullYear(), 
      now.getMonth() + 1, 
      now.getDate()].join("/");

    return path;
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

  app.param('objectId', /^\d+$/);  //ensure objectId is a number
  app.param('objectId', function(req, res, next, objectId) {
    var id = parseInt(objectId, 10);
    req.objectId = id;
    next();
  });

  app.param('featureObjectId', /^\d+$/); //ensure featureObjectId is a number

  // Grab the feature for any endpoint that uses featureObjectId
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

  var parseQueryParams = function(req, res, next) {
    var parameters = {};

    var returnGeometry = req.param('returnGeometry');
    if (returnGeometry) {
      returnGeometry = returnGeometry === 'true';
    } else {
      returnGeometry = true;
    }

    var outFields = req.param('outFields');
    if ((!outFields && returnGeometry) || (outFields && outFields !== '*')) {
      parameters.fields = {returnGeometry: returnGeometry};
      if (outFields) {
        parameters.fields.outFields = outFields.split(",");
      }
    }

    var geometry = req.param('geometry');

    if (geometry) {
      parameters.geometryType = req.param('geometryType');
      if (!parameters.geometryType) {
        parameters.geometryType = 'esriGeometryEnvelope'
      }

      try {
        parameters.geometry = geo.parseGeometry(parameters.geometryType, geometry);
      } catch (e) {
        return res.send(400, e);
      }
    }

    req.parameters = parameters;

    next();
  }

  // Queries for ESRI Styled records built for the ESRI format and syntax
  app.get('/FeatureServer/:layerId/query', parseQueryParams, function (req, res) {
    console.log("SAGE ESRI Features GET REST Service Requested");

    var filters = [{}];

    var geometry = req.parameters.geometry;
    if (geometry) {
      var geometryType = req.parameters.geometryType;

      switch (geometryType) {
        case 'esriGeometryPoint':
          filters = [];
          filter = {
            geometry: {
              type: 'Point',
              coordinates: [geometry.x, geometry.y]
            }
          };

          filters.push(filter);
          break;
        case 'esriGeometryEnvelope':
          filters = [];

          // TODO hack until mongo fixes queries for more than
          // 180 degrees longitude.  Create 2 queries if we cross
          // the prime meridian 
          if (geometry.xmax > 0 && geometry.xmin < 0) {
            filter = {
              geometry: {
                type: 'Polygon',
                coordinates: [ [ 
                  [geometry.xmin, geometry.ymin], 
                  [0, geometry.ymin], 
                  [0, geometry.ymax], 
                  [geometry.xmin, geometry.ymax], 
                  [geometry.xmin, geometry.ymin] 
                ] ]
              }
            };

            filters.push(filter);

            filter = {
              geometry: {
                type: 'Polygon',
                coordinates: [ [ 
                  [0, geometry.ymin], 
                  [geometry.xmax, geometry.ymin], 
                  [geometry.xmax, geometry.ymax], 
                  [0, geometry.ymax], 
                  [0, geometry.ymin] 
                ] ]
              }
            };
   
            filters.push(filter);
          } else {
            filter = {
              geometry: {
                type: 'Polygon',
                coordinates: [ [ 
                  [geometry.xmin, geometry.ymin], 
                  [geometry.xmax, geometry.ymin], 
                  [geometry.xmax, geometry.ymax], 
                  [geometry.xmin, geometry.ymax], 
                  [geometry.xmin, geometry.ymin] 
                ] ]
              }
            };

            filters.push(filter);
          }
        break;
        case 'esriGeometryPolygon':
          filters = [geometry];
        break;
      }
    }

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
        var response = transformers.esri.transform(allFeatures, req.parameters.fields);
        res.json(response);
      }
    );
  }); 

  // Gets one ESRI Styled record built for the ESRI format and syntax
  app.get('/FeatureServer/:layerId/:featureObjectId', function (req, res) {
    console.log("SAGE ESRI Features (ID) GET REST Service Requested");

    res.json({
      geometry: req.feature.geometry,
      attributes: req.feature.properties
    });
    
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

    var addResults = [];
    async.each(
      features,
      function(feature, done) {
        models.Feature.createFeature(req.layer, {geometry: feature.geometry, properties: feature.attributes}, function(newFeature) {
          addResults.push({
            globalId: null,
            objectId: newFeature ? newFeature.properties.OBJECTID : -1,
            success: newFeature ? true : false
          });

          done();
        });
      },
      function(err) {
        res.json({
          addResults: addResults
        });
      }
    );
  });

  // This function will update a feature by the ID
  app.post('/FeatureServer/:layerId/updateFeatures', function (req, res) {
    console.log("SAGE Features (ID) UPDATE REST Service Requested");

    var features = req.param('features');
    if (!features) {
      //TODO need common cl***REMOVED*** to house error object
      return res.json({
        error: {
          code:400,
          message: "Cannot add features. Invalid parameters.",
          details: ["'features' param not specified"]
        }
      });
    }

    features = JSON.parse(features);
    var updateResults = [];
    var updateFeature = function(feature, done) {
      models.Feature.updateFeature(req.layer, {geometry: feature.geometry, properties: feature.attributes}, function(err, newFeature) {
        if (err || !newFeature) {
          updateResults.push({
            objectId: feature.attributes.OBJECTID,
            globalId: null,
            success: false,
            error: {
              code: -1,
              description: 'Update for the object was not attempted. Object may not exist.'
            }
          });
        } else {
          updateResults.push({
            objectId: newFeature.properties.OBJECTID,
            globalId: null,
            success: true
          });
        }

        done();
      });
    }

    async.each(features, updateFeature, function(err) {
      res.json({
        updateResults: updateResults
      });
    });
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
  app.get('/FeatureServer/:layerId/:featureObjectId/attachments/:attachmentId', function(req, res, next) {
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
        return res.json(errorResponse);
      }

      var path = app.get('attachmentBase') + attachment.relativePath;
      fs.readFile(path, function(err, data) {
        if (err) next(err);

        res.writeHead(200, {
          "Content-Type": attachment.contentType,
          "Content-Length": attachment.size,
          'Content-disposition': 'attachment; filename=' + attachment.name
         });
        res.end(data, 'binary');
      });
    });
  });

  // This function will add an attachment for a particular ESRI record 
  app.post('/FeatureServer/:layerId/:objectId/addAttachment', function(req, res, next) {
    console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

    var counter = 'attachment' + req.layer.id;
    models.Counters.getNext(counter, function(id) {

      var relativePath = createAttachmentPath(req.layer, req.files.attachment)
      // move file upload to its new home
      fs.mkdirp(app.get('attachmentBase') + relativePath, function(err) {
        if (err) return next(err);

        req.files.attachment.id = id;
        req.files.attachment.relativePath = relativePath + "/" + id + "_" + req.files.attachment.filename;
        fs.rename(req.files.attachment.path, app.get('attachmentBase') + req.files.attachment.relativePath, function(err) {
          if (err) return next(err);

          models.Feature.addAttachment(req.layer, req.objectId, req.files.attachment, function(err, attachment) {
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

    var relativePath = createAttachmentPath(req.layer, req.files.attachment)
    // move file upload to its new home
    fs.mkdirp(app.get('attachmentBase') + relativePath, function(err) {
      if (err) return next(err);

      req.files.attachment.id = attachmentId;
      req.files.attachment.relativePath = relativePath + "/" + attachmentId + "_" + req.files.attachment.filename;
      fs.rename(req.files.attachment.path, app.get('attachmentBase') + req.files.attachment.relativePath, function(err) {
        if (err) return next(err);

        models.Feature.updateAttachment(req.layer, attachmentId, req.files.attachment, function(err) {
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