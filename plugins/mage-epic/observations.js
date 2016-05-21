var config = require('./config.json')
  , async = require('async')
  , request = require('request')
  , log = require('../../logger')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , ArcGIS = require('terraformer-arcgis-parser')
  , Event = require('../../models/event')
  , Observation = require('../../models/observation');

// setup mongoose to talk to mongodb
var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

var mongooseLogger = log.loggers.get('mongoose');
mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

var timeout = config.esri.observations.interval * 1000;
var url = [url.host, url.site, url.restServices, url.folder, url.serviceName, url.serviceType, url.layerId].join("/");
var fields = config.esri.observations.fields;

var defaultType = "UNKNOWN";
var types = {};
function getTypes(done) {
  log.info('getting esri types');

  request.post({url: url + "?f=json"}, function(err, res, body) {
    if (err) return done(err);
    var json = JSON.parse(body);

    if (res.statusCode !== 200) return done(new Error('Error getting ESRI types ' + res.statusCode));

    if (json.types) {
      json.types.forEach(function(type) {
        types[type.name.trim()] = type;
      });
    }

    done(null);
  });
}

var events;
function getEvents(done) {
  Event.getEvents(function(err, allEvents) {
    events = allEvents;
    done(err);
  });
}

function transform(field, value) {
  switch (field.type) {
  case "Date":
    return moment(value).valueOf();
  case "String":
    return value + '';
  case "Type":
    var type = types[value];
    type = type ? type.id : defaultType;
    return type;
  default:
    return value;
  }
}

function createEsriObservation(event, observation, callback) {
  log.info('creating new observation ' + observation._id);
  var properties = {};
  fields[event._id.toString()].forEach(function(field) {
    var value = observation.properties[field.mage];
    properties[field.esri] = transform(field, value);
  });
  observation.properties = properties;

  var featureUrl = url + "/addFeatures?f=json&features=" + JSON.stringify([ArcGIS.convert(observation)]);
  log.info('sending', featureUrl);
  request.post({url: featureUrl}, function(err, res, body) {
    if (err) return callback(err);

    var json = JSON.parse(body);
    log.info('ESRI attachment add response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    var result = json.addResults[0];
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ', result[0].error));
    }

    callback(null, result.objectId);
  });
}

function updateEsriObservation(event, observation, callback) {
  log.info('updating observation ' + observation._id);
  var properties = {};
  fields[event._id.toString()].forEach(function(field) {
    var value = observation.properties[field.mage];
    properties[field.esri] = transform(field, value);
  });
  observation.properties = properties;
  observation.properties.OBJECTID = observation.esriId;

  var featureUrl = url + "/updateFeatures?f=json&features=" + JSON.stringify([ArcGIS.convert(observation)]);
  log.info('sending', featureUrl);
  request.post({url: featureUrl}, function(err, res, body) {
    if (err) return callback(err);

    var json = JSON.parse(body);
    log.info('ESRI attachment update response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    var result = json.updateResults[0];
    if (!result.success) {
      log.error('error updating observation', JSON.stringify(result.error));
      return callback(new Error('Error sending ESRI json ', result.error));
    }

    callback(null, result.objectId);
  });
}

function pushObservations(done) {
  fs.readJson(__dirname + "/.observations.json", function(err, lastObservationTimes) {
    lastObservationTimes = lastObservationTimes || {};
    log.info('last observation times', lastObservationTimes);

    async.each(events,
      function(event, done) {
        log.info('pushing observations for event ' + event.name);

        var filter = {};

        var lastTime = lastObservationTimes[event.collectionName];
        if (lastTime) {
          filter.startDate = moment(lastTime).add('milliseconds', 1).toDate();
        }

        Observation.getObservations(event, {filter: filter, sort: {lastModified: 1}}, function(err, observations) {
          if (!observations) return done(new Error("Error getting observations from mage"));

          // all these observations are new or updated and need to be pushed to ESRI server
          log.info('pushing ' + observations.length + ' to esri server');
          async.each(observations, function(observation, done) {
            if (observation.esriId) {
              updateEsriObservation(event, observation, function(err) {
                if (err) log.error('error updating esri observation', err);
                done();
              });
            } else {
              createEsriObservation(event, observation, function(err, objectId) {
                if (err) {
                  log.error('error creating esri attachment', err);
                  return done();
                }

                Observation.observationModel(event).findByIdAndUpdate(observation._id, {esriId: objectId}, {new: true}, done);
              });
            }
          },
          function(err) {
            if (observations.length > 0) {
              lastObservationTimes[event.collectionName] = observations[observations.length - 1].lastModified;
            }

            done(err);
          });
        });
      },
      function(err) {
        log.info('done with observation push', err);
        if (!err) {
          fs.writeJson(__dirname + "/.observations.json", lastObservationTimes, done);
        }
      }
    );
  });
}

function push() {
  log.info('pushing data to esri server ' + moment().toISOString());

  async.series({
    types: getTypes,
    events: getEvents,
    observations: pushObservations
  },
  function(err) {
    if (err) log.error('Error pushing observations to esri server', err);

    log.info('finished pushing all data to esri server ' + moment().toISOString());
    setTimeout(push, timeout);
  });
}

push();
