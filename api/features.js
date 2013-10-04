var FeatureModel = require('../models/feature')
  , util = require('util')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , geometryFormat = require('../format/geoJsonFormat');

function Feature(layer) {
  this._layer = layer;
};

Feature.prototype.getAll = function(options, callback) {
  var filter = options.filter;
  if (filter && filter.geometries) {
    allFeatures = [];
    async.each(
      filter.geometries, 
      function(geometry, done) {
        options.filter.geometry = geometry;
        FeatureModel.getFeatures(this._layer, options, function (features) {
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
    FeatureModel.getFeatures(this._layer, options, function (features) {
      callback(features);
    });
  }
}

Feature.prototype.getById = function(id, callback) {
  FeatureModel.getFeatureById(this._layer, id, function(feature) {
    callback(feature);
  });
}

Feature.prototype.create = function(features, callback) {
  features = util.isArray(features) ? features : [features];

  var layer = this._layer;
  var newFeatures = [];
  async.each(
    features,
    function(feature, done) {
      FeatureModel.createFeature(layer, feature, function(newFeature) {
        newFeatures.push(newFeature);
        done();
      });
    },
    function(err) {
      callback(newFeatures);
    }
  );
}

module.exports = Feature;