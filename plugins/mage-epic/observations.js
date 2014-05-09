var config = require('./config.json')
  , serverConfig = require('../../config.json')
  , async = require('async')
  , request = require('request')
  , path = require('path')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , ArcGIS = require('terraformer-arcgis-parser')
  , Layer = require('../../models/layer')
  , Feature = require('../../models/feature');

// setup mongoose to talk to mongodb
var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});
mongoose.set('debug', true);

var timeout = config.esri.observations.interval * 1000;
var url = config.esri.url;
var url = [url.host, url.site, url.restServices, url.folder, url.***REMOVED***Name, url.***REMOVED***Type, url.layerId].join("/");
var fields = config.esri.observations.fields;

var defaultType = "UNKNOWN";
var defaultLabel = "UNDEFINED";
var types = {};
function getTypes(done) {
  console.log('getting esri types');

  request.post({url: url + "?f=json"}, function(err, res, body) {
    if (err) return done(err);
    var json = JSON.parse(body);

    if (res.statusCode != 200) return callback(new Error('Error getting ESRI types ' + res.statusCode));

    if (json.types) {
      json.types.forEach(function(type) {
        types[type.name.trim()] = type;
      });
    }

    if (json.drawingInfo && json.drawingInfo.renderer && json.drawingInfo.renderer.defaultLabel) {
      defaultLabel = json.drawingInfo.renderer.defaultLabel;
    }

    done(null);
  });
}

var layers;
function getLayers(done) {
  Layer.getLayers({type: 'Feature'}, function(err, featureLayers) {
    layers = featureLayers;
    done(err);
  });
}

function transform(field, value) {
  switch (field.type) {
    case "Date": {
      return moment(value).valueOf();
    }
    case "String": {
      return value + '';
    }
    case "Type": {
      var type = types[value];
      type = type ? type.id : defaultType;
      return type;
    }
    default: {
      return value;
    }
  }
}

function createEsriObservation(feature, callback) {
  console.log('creating new observation ' + feature._id);
  var properties = {};
  fields.forEach(function(field) {
    var value = feature.properties[field.mage];
    properties[field.esri] = transform(field, value);
  });
  feature.properties = properties;

  featureUrl = url + "/addFeatures?f=json&features=" + JSON.stringify([ArcGIS.convert(feature)]);
  console.log('sending', featureUrl);
  request.post({url: featureUrl}, function(err, res, body) {
    if (err) return done(err);
    var json = JSON.parse(body);
    console.log('ESRI attachment add response', json);

    if (res.statusCode != 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    var result = json.addResults[0];
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ', results[0].error));
    }

    callback(null, result.objectId);
  });
}

function updateEsriObservation(feature, callback) {
  console.log('updating observation ' + feature._id);
  var properties = {};
  fields.forEach(function(field) {
    var value = feature.properties[field.mage];
    properties[field.esri] = transform(field, value);
  });
  feature.properties = properties;
  feature.properties.OBJECTID = feature.esriId;

  featureUrl = url + "/updateFeatures?f=json&features=" + JSON.stringify([ArcGIS.convert(feature)]);
  console.log('sending', featureUrl);
  request.post({url: featureUrl}, function(err, res, body) {
    if (err) return done(err);
    var json = JSON.parse(body);
    console.log('ESRI attachment update response', json);

    if (res.statusCode != 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    var result = json.updateResults[0];
    if (!result.success) {
      console.log('error updating observation', JSON.stringify(result.error));
      return callback(new Error('Error sending ESRI json ', result.error));
    }

    callback(null, result.objectId);
  });
}

function pushFeatures(done) {
  fs.readJson(__dirname + "/.observations.json", function(err, lastFeatureTimes) {
    lastFeatureTimes = lastFeatureTimes || {};
    console.log('last feature times', lastFeatureTimes);

    async.each(layers,
      function(layer, done) {
        console.log('pushing features for layer ' + layer.name);

        var filter = {};

        var lastTime = lastFeatureTimes[layer.collectionName];
        if (lastTime) {
          filter.startDate = moment(lastTime).add('milliseconds', 1).toDate();
        }

        Feature.getFeatures(layer, {filter: filter, sort: {lastModified: 1}}, function(features) {
          if (!features) return done(new Error("Error getting features from mage"));

          // all these observations are new or updated and need to be pushed to ESRI server
          console.log('pushing ' + features.length + ' to esri server');
          async.each(features, function(feature, done) {
            if (feature.esriId) {
              updateEsriObservation(feature, function(err) {
                if (err) console.log('error updating esri observation', err);
                done();
              });
            } else {
              createEsriObservation(feature, function(err, objectId) {
                if (err) {
                  console.log('error creating esri attachment', err);
                  return done();
                }

                Feature.featureModel(layer).findByIdAndUpdate(feature._id, {esriId: objectId}, done);
              });
            }
          },
          function(err) {
            if (features.length > 0) {
              lastFeatureTimes[layer.collectionName] = features[features.length - 1].lastModified;
            }

            done(err);
          });
        });
      },
      function(err) {
        console.log('done with observation push', err);
        if (!err) {
          fs.writeJson(__dirname + "/.observations.json", lastFeatureTimes, done);
        }
      }
    );
  });
}

function push() {
  console.log('pushing data to esri server ' + moment().toISOString());

  async.series({
    types: getTypes,
    layers: getLayers,
    features: pushFeatures
  },
  function(err, results) {
    if (err) console.log('Error pushing observations to esri server', err);

    console.log('finished pushing all data to esri server ' + moment().toISOString());
    setTimeout(push, timeout);
  });
};

push();
