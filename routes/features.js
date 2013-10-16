// feature routes
module.exports = function(app, auth) {

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
  app.get(
    '/FeatureServer/:layerId/features/:id', 
    access.authorize('READ_FEATURE'),
    parseQueryParams,
    function (req, res) {
      console.log("MAGE Features (ID) GET REST Service Requested");
      
      var options = {fields: req.parameters.fields};
      new api.Feature(req.layer).getById(req.param('id'), options, function(feature) {
        var response = geojson.transform(feature);
        res.json(response);
      });
    }
  ); 

  // This function creates a new Feature
  app.post(
    '/FeatureServer/:layerId/features', 
    access.authorize('CREATE_FEATURE'),
    function (req, res) {
      console.log("MAGE Features POST REST Service Requested");

      var feature = req.body;
      feature.properties = feature.properties || {};

      var userId = req.user ? req.user._id : null;
      if (userId) feature.properties.userId = userId;

      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) feature.properties.deviceId = deviceId;

      new api.Feature(req.layer).create(feature, function(newFeature) {
        if (!newFeature) return res.send(400);

        var response = geojson.transform(newFeature);
        res.location(newFeature._id.toString()).json(response);
      }
    );
  }); 


  // This function will update a feature by the ID
  app.put(
    '/FeatureServer/:layerId/features/:id',
    access.authorize('UPDATE_FEATURE'),
    function (req, res) {
      console.log("MAGE Features (ID) UPDATE REST Service Requested");

      var feature = req.body;
      feature.properties = feature.properties || {};

      var userId = req.user ? req.user._id : null;
      if (userId) feature.properties.userId = userId;

      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) feature.properties.deviceId = deviceId;

      new api.Feature(req.layer).update(req.param('id'), req.body, function(err, updatedFeature) {
        var response = geojson.transform(updatedFeature);
        res.json(response);
      }
    );
  }); 

  // This function deletes one feature based on ID
  app.delete(
    '/FeatureServer/:layerId/features/:id',
    access.authorize('DELETE_FEATURE'),
    function (req, res) {
      console.log("MAGE Features (ID) DELETE REST Service Requested");

      new api.Feature(req.layer).delete(req.param('id'), function(err, deletedFeature) {
        var response = geojson.transform(deletedFeature);
        res.json(response);
      }
    );
  }); 

  app.get(
    '/FeatureServer/:layerId/features/:featureId/attachments/:attachmentId',
    access.authorize('READ_FEATURE'),
    function(req, res) {
      new api.Attachment(req.layer, req.feature).getById(req.param('attachmentId'), function(err, attachment) {
        res.writeHead(200, {
          "Content-Type": attachment.attachment.contentType,
          "Content-Length": attachment.attachment.size,
          'Content-disposition': 'attachment; filename=' + attachment.attachment.name
         });
        res.end(attachment.data, 'binary');
      }
    );
  });

  // This function will add an attachment for a particular ESRI record 
  app.post(
    '/FeatureServer/:layerId/features/:featureId/attachments',
    access.authorize('CREATE_FEATURE'),
    function(req, res, next) {
      console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

      new api.Attachment(req.layer, req.feature).create(req.featureId, req.files.attachment, function(err, attachment) {
        if (err) return next(err);

        return res.json(attachment);
      });
    }
  );

  // This function will update the specified attachment
  app.put(
    '/FeatureServer/:layerId/features/:featureId/attachments/:attachmentId',
    access.authorize('UPDATE_FEATURE'),
    function(req, res, next) {
      console.log("SAGE ESRI Features (ID) Attachments UPDATE REST Service Requested");

      new api.Attachment(req.layer, req.feature).update(req.featureId, req.files.attachment, function(err, attachment) {
        if (err) return next(err);

        return res.json(attachment);
      });
    }
  );

  // This function will delete all attachments for the given list of attachment ids
  app.delete(
    '/FeatureServer/:layerId/features/:featureId/attachments/:attachmentId',
    access.authorize('DELETE_FEATURE'),
    function(req, res) {
      console.log("SAGE ESRI Features (ID) Attachments DELETE REST Service Requested");

      new api.Attachment(req.layer, req.feature).delete(req.param('attachmentId'), function(err) {
        res.send(200);
      });
    }
  );
}