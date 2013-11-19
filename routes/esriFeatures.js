// ESRI feature routes
module.exports = function(app, security) {
  var api = require('../api')
    , async = require('async')
    , fs = require('fs-extra')
    , path = require('path')
    , esri = require('../transformers/esri')
    , ArcGIS = require('terraformer-arcgis-parser')
    , Counter = require('../models/counter')
    , Feature = require('../models/feature')
    , access = require('../access')
    , config = require('../config.json');

  var p***REMOVED***port = security.authentication.p***REMOVED***port;
  var geometryFormat = require('../format/geometryFormat');
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
        var geometries = geometryFormat.parse(parameters.geometryType, geometry);
        if (geometries) parameters.filter = {geometries: geometries};
      } catch (e) {
        return res.send(400, e);
      }
    }

    req.parameters = parameters;

    next();
  }

  var toGeoJSON = function(arcgis, userId, deviceId) {
    var features = arcgis.map(function(esriFeature) {
      var feature = ArcGIS.parse(esriFeature);
      if (feature.geometry) delete feature.geometry.bbox;  // ESRI terraformer transforms geometries w/ bbox property, no need to store this
      feature.properties = feature.properties || {};
      if (userId) feature.properties.userId = userId;
      if (deviceId) feature.properties.deviceId = deviceId;

      return feature;
    });

    return features;
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
        var response = esri.transform(features);
        res.json(response);
      });
    }
  ); 

  // Gets one ESRI Styled record built for the ESRI format and syntax
  app.get(
    '/FeatureServer/:layerId/:featureObjectId',
    access.authorize('READ_FEATURE'),
    function (req, res) {
      console.log("SAGE ESRI Features (ID) GET REST Service Requested");

      new api.Feature(req.layer).getById({id: req.featureId, field: 'properties.OBJECTID'}, function(feature) {
        var esriFeature = ArcGIS.convert(feature);
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

      var arcgis = req.param('features');
      if (!arcgis) {
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

      // convert the p***REMOVED***ed in ESRI features to GeoJSON
      var userId = req.user ? req.user._id : null;
      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      var features = toGeoJSON(JSON.parse(arcgis), userId, deviceId);

      var results = [];
      var Feature = new api.Feature(req.layer);
      async.each(
        features,
        function(feature, done) {
          Feature.create(feature, function(newFeature) {
            results.push({
              globalId: null,
              objectId: newFeature ? newFeature.properties.OBJECTID : -1,
              success: newFeature ? true : false
            });

            done();        
          });
        },
        function(err) {
          res.json({addResults: results});
        }
      );
    }
  );

  // This function will update a feature by the ID
  app.post(
    '/FeatureServer/:layerId/updateFeatures',
    access.authorize('UPDATE_FEATURE'),
    function (req, res) {
      console.log("SAGE Features (ID) UPDATE REST Service Requested");

      var arcgis = req.param('features');
      if (!arcgis) {
        //TODO need common cl***REMOVED*** to house error object
        return res.json({
          error: {
            code:400,
            message: "Cannot add features. Invalid parameters.",
            details: ["'features' param not specified"]
          }
        });
      }

      var userId = req.user ? req.user._id : null;
      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      var features = toGeoJSON(JSON.parse(arcgis), userId, deviceId);

      var results = [];
      var Feature = new api.Feature(req.layer);
      async.each(
        features,
        function(feature, done) {
          Feature.update({id: feature.properties.OBJECTID, field: 'properties.OBJECTID'}, feature, function(err, updatedFeature) {
            results.push({
              globalId: null,
              objectId: updatedFeature ? updatedFeature.properties.OBJECTID : -1,
              success: updatedFeature ? true : false
            });

            done();          
          });
        },
        function(err) {
          return res.json({updateResults: results});
        }
      );
    }
  );

  // This function will delete all features based on p***REMOVED***ed in ids
  // TODO test, make sure attachments are deleted.
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

      var results = [];
      var Feature = new api.Feature(req.layer);
      async.each(
        objectIds.split(","),
        function(id, done) {
          id = parseInt(id, 10); // Convert to int
          Feature.delete({id: id, field: 'properties.OBJECTID'}, function(err, feature) {
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
            }

            done();
          });
        },
        function(err) {
          return res.json({deleteResults: results});
        }
      );
    }
  );

  // This function gets an array of the attachments for a particular ESRI record  
  app.get(
    '/FeatureServer/:layerId/:featureObjectId/attachments',
    access.authorize('READ_FEATURE'),
    function(req, res){
      console.log("SAGE ESRI Features (ID) Attachments GET REST Service Requested");

      var esriAttachments = new EsriAttachments();
      req.feature.attachments.forEach(function(attachment) {
        esriAttachments.add(attachment);
      });

      res.json(esriAttachments.attachments());
    }
  );

  // This function gets a specific attachment for an ESRI feature 
  app.get(
    '/FeatureServer/:layerId/:featureObjectId/attachments/:attachmentId',
    access.authorize('READ_FEATURE'),
    function(req, res, next) {
      console.log("SAGE ESRI Features (ID) Attachments (ID) GET REST Service Requested");

      var attachmentId = req.params.attachmentId;
      new api.Attachment(req.layer, req.feature).getById({id: attachmentId, field: 'id'}, function(err, attachment) {
        if (err) return next(err);

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

        res.writeHead(200, {
          "Content-Type": attachment.attachment.contentType,
          "Content-Length": attachment.attachment.size,
          'Content-disposition': 'attachment; filename=' + attachment.attachment.name
         });
        res.end(attachment.data, 'binary');
      });
    }
  );

  // This function will add an attachment for a particular ESRI record 
  app.post(
    '/FeatureServer/:layerId/:objectId/addAttachment',
    access.authorize('CREATE_FEATURE'),
    function(req, res, next) {
      console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

      new api.Attachment(req.layer, req.feature).create({id: req.objectId, field: 'properties.OBJECTID'}, req.files.attachment, function(err, attachment) {
        if (err) return next(err);

        var response = {
          addAttachmentResult: {
            objectId: attachment ? attachment.id : -1,
            globalId: null,
            success: attachment ? true : false
          }
        };

        return res.json(response);
      });
    }
  );

  // This function will update the specified attachment for the given list of attachment ids
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
      new api.Attachment(req.layer, req.feature).update({id: attachmentId, field: 'id'}, req.files.attachment, function(err, attachment) {
        if (err) return next(err);

        return  res.json({
          updateAttachmentResult: {
            objectId: attachmentId,
            globalId: null,
            success: true
          }
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
      var Attachment = new api.Attachment(req.layer, req.feature);
      var deleteResults = [];
      async.each(
        attachmentIds,
        function(attachmentId, done) {
          Attachment.delete({id: attachmentId, field: 'id'}, function(err) {
            deleteResults.push({
              objectId: attachmentId,
              globalId: null,
              success: err ? false : true
            });

            done();
          });
        },
        function(err) {
          return res.json({deleteAttachmentResults: deleteResults});
        }
      );
    }
  );
}