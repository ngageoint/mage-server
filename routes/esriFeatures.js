// ESRI feature routes
module.exports = function(app, security) {
  var api = require('../api')
    , async = require('async')
    , fs = require('fs-extra')
    , path = require('path')
    , arcgis = require('terraformer-arcgis-parser')
    , Counter = require('../models/counter')
    , Feature = require('../models/feature')
    , access = require('../access')
    , config = require('../config.json');

  var p***REMOVED***port = security.authentication.p***REMOVED***port;
  var geometryFormat = require('../format/geometryFormat');
  var geojson = require('../transformers/geojson');
  var attachmentBase = config.server.attachmentBaseDirectory;

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
    return path.join(layer.collectionName, now.getFullYear().toString(), (now.getMonth() + 1).toString(), now.getDate().toString());
  }

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
      parameters.fields = {
        type: true,
        geometry: returnGeometry
      };
      if (outFields) {
        parameters.fields.properties = {};
        outFields.split(",").forEach(function(field) {
          parameters.fields.properties[field] = true;
        });
      }
    }

    var geometry = req.param('geometry');
    if (geometry) {
      parameters.geometryType = req.param('geometryType');
      if (!parameters.geometryType) {
        parameters.geometryType = 'esriGeometryEnvelope'
      }

      try {
        parameters.filter.geometries = geometryFormat.parse(parameters.geometryType, geometry);
      } catch (e) {
        return res.send(400, e);
      }
    }

    req.parameters = parameters;

    next();
  }

  // Queries for ESRI Syled records built for the ESRI format and syntax
  app.get(
    '/FeatureServer/:layerId/query',
    access.authorize('READ_FEATURE'), 
    parseQueryParams, 
    function (req, res) {
      console.log("SAGE ESRI Features GET REST Service Requested");

      var options = {
        filter: req.parameters.filter,
        fields: req.parameters.fields
      }
      new api.Feature(req.layer).getAll(options, function(features) {
        var response = arcgis.convert({
          type: 'FeatureCollection',
          features: features
        });
        res.json(response);
      });
    }
  ); 

  // Gets one ESRI Styled record built for the ESRI format and syntax
  app.get(
    '/FeatureServer/:layerId/:featureId',
    access.authorize('READ_FEATURE'),
    function (req, res) {
      console.log("SAGE ESRI Features (ID) GET REST Service Requested");

      new api.Feature(req.layer).getById({id: req.featureId, field: 'properties.OBJECTID'}, function(feature) {
        var esriFeature = arcgis.convert(feature);
        res.json({feature: esriFeature});
      });
    }
  ); 

  // This function creates a new ESRI Style Feature 
  app.post(
    '/FeatureServer/:layerId/addFeatures',
    access.authorize('CREATE_FEATURE'),
    function(req, res) {
      console.log("SAGE ESRI Features POST REST Service Requested");

      var esriFeatures = req.param('features');
      if (!esriFeatures) {
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

      esriFeatures = JSON.parse(esriFeatures);
      var features = [];
      esriFeatures.forEach(function(esriFeature) {
        var feature = arcgis.parse(esriFeature);
        feature.properties = feature.properties || {};
        if (req.user) feature.properties.userId = req.user._id;
        if (req.provisionedDeviceId) feature.properties.deviceId = req.provisionedDeviceId;
        features.push(feature);
      });

      new api.Feature(req.layer).create(features, function(newFeatures) {
        var results = [];
        newFeatures.forEach(function(newFeature) {
          results.push({
            globalId: null,
            objectId: newFeature ? newFeature.properties.OBJECTID : -1,
            success: newFeature ? true : false
          });
        });

        res.json({addResults: results});
      });
    }
  );

  // This function will update a feature by the ID
  app.post(
    '/FeatureServer/:layerId/updateFeatures',
    access.authorize('UPDATE_FEATURE'),
    function (req, res) {
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
        var properties = feature.attributes || {};
        if (req.user) properties.userId = req.user._id;
        if (req.provisionedDeviceId) properties.deviceId = req.provisionedDeviceId;
        Feature.updateFeature(req.layer, {geometry: feature.geometry, properties: properties}, function(err, newFeature) {
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
    }
  );

  app.post(
    '/FeatureServer/:layerId/deleteFeatures',
    access.authorize('DELETE_FEATURE'),
    function(req, res) {
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
            objectId: feature.properties.OBJECTID,
            globalId: null,
            success: true
          });

          feature.attachments.forEach(function(attachment) {
            var file = path.join(attachmentBase, attachment.relativePath);
            fs.remove(file, function(err) {
              if (err) {
                console.error("Could not remove attachment file " + file + ". ", err);
              }
            });
          });
        }

        if (!objectIds.length) {
          return res.json({deleteResults: results});
        }

        Feature.removeFeature(req.layer, objectIds.pop(), onUpdate);
      }


      Feature.removeFeature(req.layer, objectIds.pop(), onDelete);
    }
  );

  // This function gets all the attachments for a particular ESRI record  
  app.get(
    '/FeatureServer/:layerId/:featureObjectId/attachments',
    access.authorize('READ_FEATURE'),
    function(req, res){
      console.log("SAGE ESRI Features (ID) Attachments GET REST Service Requested");

      var esriAttachments = new EsriAttachments();
      Feature.getAttachments(req.feature, function(attachments) {
        if (attachments) {
          attachments.forEach(function(attachment) {
            esriAttachments.add(attachment);
          });
        }

        res.json(esriAttachments.attachments());
      });
    }
  );

  // This function gets a specific attachment for an ESRI feature 
  app.get(
    '/FeatureServer/:layerId/:featureObjectId/attachments/:attachmentId',
    access.authorize('READ_FEATURE'),
    function(req, res, next) {
      console.log("SAGE ESRI Features (ID) Attachments (ID) GET REST Service Requested");

      var attachmentId = req.params.attachmentId;
      Feature.getAttachment(req.feature, attachmentId, function(attachment) {
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

        var file = path.join(attachmentBase, attachment.relativePath);
        console.log('trying to read file: ', file);
        fs.readFile(file, function(err, data) {
          if (err) return next(err);

          res.writeHead(200, {
            "Content-Type": attachment.contentType,
            "Content-Length": attachment.size,
            'Content-disposition': 'attachment; filename=' + attachment.name
           });
          res.end(data, 'binary');
        });
      });
    }
  );

  // This function will add an attachment for a particular ESRI record 
  app.post(
    '/FeatureServer/:layerId/:objectId/addAttachment',
    access.authorize('CREATE_FEATURE'),
    function(req, res, next) {
      console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

      var counter = 'attachment' + req.layer.id;
      Counter.getNext(counter, function(id) {

        var relativePath = createAttachmentPath(req.layer, req.files.attachment)
        // move file upload to its new home
        var dir = path.join(attachmentBase, relativePath);
        fs.mkdirp(dir, function(err) {
          if (err) return next(err);

          req.files.attachment.id = id;
          var fileName = path.basename(req.files.attachment.path);
          req.files.attachment.relativePath = path.join(relativePath, fileName);
          var file = path.join(attachmentBase, req.files.attachment.relativePath);
          fs.rename(req.files.attachment.path, file, function(err) {
            if (err) return next(err);

            Feature.addAttachment(req.layer, req.objectId, req.files.attachment, function(err, attachment) {
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
    }
  );

  // This function will update the specified attachment for the given list of attachment ids
  // TODO test
  app.post(
    '/FeatureServer/:layerId/:featureObjectId/updateAttachment',
    access.authorize('UPDATE_FEATURE'),
    function(req, res, next) {
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

      var relativePath = createAttachmentPath(req.layer, req.files.attachment);
      var dir = path.join(attachmentBase, relativePath);
      // move file upload to its new home
      fs.mkdirp(dir, function(err) {
        if (err) return next(err);

        req.files.attachment.id = attachmentId;
        var fileName = path.basename(req.files.attachment.path);
        req.files.attachment.relativePath = path.join(relativePath, fileName);
        var file = path.join(attachmentBase, req.files.attachment.relativePath);
        fs.rename(req.files.attachment.path, file, function(err) {
          if (err) return next(err);

          Feature.updateAttachment(req.layer, attachmentId, req.files.attachment, function(err) {
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
    }
  );

  // This function will delete all attachments for the given list of attachment ids
  app.post(
    '/FeatureServer/:layerId/:featureObjectId/deleteAttachments',
    access.authorize('DELETE_FEATURE'),
    function(req, res) {
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

      Feature.removeAttachments(req.feature, attachmentIds, function(err) {
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
          attachments.forEach(function(attachment) {
            var index = attachmentIds.indexOf(attachment.id);
            if (index != -1) {
              var file = path.join(attachmentBase, attachment.relativePath);
              fs.remove(file, function(err) {
                if (err) {
                  console.error("Could not remove attachment file " + file + ". ", err);
                }
              });
            }
          });
        }
      });
    }
  );
}