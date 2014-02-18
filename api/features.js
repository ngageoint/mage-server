var FeatureModel = require('../models/feature')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json')
  , geometryFormat = require('../format/geoJsonFormat');

var attachmentBase = config.server.attachmentBaseDirectory;

function Feature(layer) {
  this._layer = layer;
};

Feature.prototype.getAll = function(options, callback) {
  var layer = this._layer;
  var filter = options.filter;
  if (filter && filter.geometries) {
    allFeatures = [];
    async.each(
      filter.geometries, 
      function(geometry, done) {
        options.filter.geometry = geometry;
        FeatureModel.getFeatures(layer, options, function (features) {
          if (features) {
            allFeatures = allFeatures.concat(features);
          }

          done();
        });
      },
      function(err) {
        callback(allFeatures);
      }
    );
  } else {
    FeatureModel.getFeatures(layer, options, function (features) {
      callback(features);
    });
  }
}

Feature.prototype.getById = function(id, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  FeatureModel.getFeatureById(this._layer, id, options, function(feature) {
    callback(feature);
  });
}

Feature.prototype.create = function(feature, callback) {
  FeatureModel.createFeature(this._layer, feature, function(newFeature) {
    callback(newFeature);
  });
}

Feature.prototype.createFeatures = function(features, callback) {
  FeatureModel.createFeatures(this._layer, features, function(err, newFeatures) {
    callback(err, newFeatures);
  });
}

Feature.prototype.update = function(id, feature, callback) {
  FeatureModel.updateFeature(this._layer, id, feature, function(err, updatedFeature) {
    callback(err, updatedFeature);
  });
}

Feature.prototype.addState = function(id, state, callback) {
  FeatureModel.addState(this._layer, id, state, function(err, updatedFeature) {
    callback(err, updatedFeature);
  });
}

Feature.prototype.delete = function(id, callback) {
  FeatureModel.removeFeature(this._layer, id, function(err, feature) {
    if (feature) {
      feature.attachments.forEach(function(attachment) {
        var file = path.join(attachmentBase, attachment.relativePath);
        fs.remove(file, function(err) {
          if (err) {
            console.error("Could not remove attachment file " + file + ". ", err);
          }
        });
      });
    }

    callback(err, feature);
  });
}

module.exports = Feature;