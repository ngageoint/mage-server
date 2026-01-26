// plugins/epic/observations.js
const config = require('./config.json');
const async = require('async');
const request = require('request');
const log = require('../../logger'); // centralized logger
const fs = require('fs-extra');
const mongoose = require('mongoose');
const moment = require('moment');
const ArcGIS = require('terraformer-arcgis-parser');
const Event = require('../../models/event');
const Observation = require('../../models/observation');
const { mongooseLogger } = require('../../logger');

// setup mongoose to talk to mongodb
const mongodbConfig = config.mongodb;
mongoose.connect(
  mongodbConfig.url,
  { server: { poolSize: mongodbConfig.poolSize } },
  function(err) {
    if (err) {
      log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
      throw err;
    }
  }
);

mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.debug("%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

const timeout = config.esri.observations.interval * 1000;
const url = [url.host, url.site, url.restServices, url.folder, url.serviceName, url.serviceType, url.layerId].join("/");
const fields = config.esri.observations.fields;

const defaultType = "UNKNOWN";
const types = {};

function getTypes(done) {
  log.info('getting esri types');

  request.post({ url: url + "?f=json" }, function(err, res, body) {
    if (err) return done(err);
    const json = JSON.parse(body);

    if (res.statusCode !== 200) return done(new Error('Error getting ESRI types ' + res.statusCode));

    if (json.types) {
      json.types.forEach(function(type) {
        types[type.name.trim()] = type;
      });
    }

    done(null);
  });
}

let events;
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
      const type = types[value];
      return type ? type.id : defaultType;
    default:
      return value;
  }
}

function createEsriObservation(event, observation, callback) {
  log.info('creating new observation ' + observation._id);
  const properties = {};
  fields[event._id.toString()].forEach(function(field) {
    const value = observation.properties[field.mage];
    properties[field.esri] = transform(field, value);
  });
  observation.properties = properties;

  const featureUrl = url + "/addFeatures?f=json&features=" + JSON.stringify([ArcGIS.convert(observation)]);
  log.info('sending', featureUrl);
  request.post({ url: featureUrl }, function(err, res, body) {
    if (err) return callback(err);

    const json = JSON.parse(body);
    log.info('ESRI observation add response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    const result = json.addResults[0];
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ' + JSON.stringify(result.error)));
    }

    callback(null, result.objectId);
  });
}

function updateEsriObservation(event, observation, callback) {
  log.info('updating observation ' + observation._id);
  const properties = {};
  fields[event._id.toString()].forEach(function(field) {
    const value = observation.properties[field.mage];
    properties[field.esri] = transform(field, value);
  });
  observation.properties = properties;
  observation.properties.OBJECTID = observation.esriId;

  const featureUrl = url + "/updateFeatures?f=json&features=" + JSON.stringify([ArcGIS.convert(observation)]);
  log.info('sending', featureUrl);
  request.post({ url: featureUrl }, function(err, res, body) {
    if (err) return callback(err);

    const json = JSON.parse(body);
    log.info('ESRI observation update response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    const result = json.updateResults[0];
    if (!result.success) {
      log.error('error updating observation', JSON.stringify(result.error));
      return callback(new Error('Error sending ESRI json ' + JSON.stringify(result.error)));
    }

    callback(null, result.objectId);
  });
}

function pushObservations(done) {
  fs.readJson(__dirname + "/.observations.json", function(err, lastObservationTimes) {
    lastObservationTimes = lastObservationTimes || {};
    log.info('last observation times', lastObservationTimes);

    async.each(
      events,
      function(event, done) {
        log.info('pushing observations for event ' + event.name);

        const filter = {};
        const lastTime = lastObservationTimes[event.collectionName];
        if (lastTime) {
          filter.startDate = moment(lastTime).add(1, 'milliseconds').toDate();
        }

        Observation.getObservations(event, { filter, sort: { lastModified: 1 } }, function(err, observations) {
          if (!observations) return done(new Error("Error getting observations from mage"));

          log.info('pushing ' + observations.length + ' to esri server');
          async.each(
            observations,
            function(observation, done) {
              if (observation.esriId) {
                updateEsriObservation(event, observation, function(err) {
                  if (err) log.error('error updating esri observation', err);
                  done();
                });
              } else {
                createEsriObservation(event, observation, function(err, objectId) {
                  if (err) {
                    log.error('error creating esri observation', err);
                    return done();
                  }

                  Observation.observationModel(event).findByIdAndUpdate(observation._id, { esriId: objectId }, { new: true }, done);
                });
              }
            },
            function(err) {
              if (observations.length > 0) {
                lastObservationTimes[event.collectionName] = observations[observations.length - 1].lastModified;
              }
              done(err);
            }
          );
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

  async.series(
    { types: getTypes, events: getEvents, observations: pushObservations },
    function(err) {
      if (err) log.error('Error pushing observations to esri server', err);

      log.info('finished pushing all data to esri server ' + moment().toISOString());
      setTimeout(push, timeout);
    }
  );
}

push();
