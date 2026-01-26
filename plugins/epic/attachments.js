// plugins/epic/index.js
const log = require('../../logger'); // centralized logger
const config = require('./config.json');
const environment = require('../environment/env');
const async = require('async');
const request = require('request');
const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');
const moment = require('moment');
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

const attachmentBase = environment.attachmentBaseDirectory;
const timeout = config.esri.attachments.interval * 1000;
const url = [url.host, url.site, url.restServices, url.folder, url.serviceName, url.serviceType, url.layerId].join("/");

let events;

function getEvents(done) {
  Event.getEvents(function(err, allEvents) {
    events = allEvents;
    done(err);
  });
}

function createEsriAttachment(esriId, attachment, callback) {
  log.info('creating new attachment ' + esriId);

  const attachmentUrl = [url, esriId, "addAttachment"].join("/") + "?f=json";
  log.info('sending', attachmentUrl);
  const r = request.post({ url: attachmentUrl }, function(err, res, body) {
    if (err) return callback(err);

    const json = JSON.parse(body);
    log.info('ESRI observation add response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    const result = json.addAttachmentResult;
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ' + JSON.stringify(result.error)));
    }

    callback(null, result.objectId);
  });

  const file = path.join(attachmentBase, attachment.relativePath);
  const form = r.form();
  form.append('attachment', fs.createReadStream(file));
}

function updateEsriAttachment(esriId, attachment, callback) {
  log.info('updating attachment ' + esriId);

  const attachmentUrl = [url, esriId, "updateAttachment"].join("/") + "?f=json";
  log.info('sending attachment to ESRI', attachmentUrl);
  const r = request.post({ url: attachmentUrl }, function(err, res, body) {
    if (err) return callback(err);

    const json = JSON.parse(body);
    log.info('ESRI observation update response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    const result = json.updateAttachmentResult;
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ' + JSON.stringify(result.error)));
    }

    callback(null);
  });

  const file = path.join(attachmentBase, attachment.relativePath);
  const form = r.form();
  form.append('attachment', fs.createReadStream(file));
  form.append('attachmentId', attachment.esriId);
}

function pushAttachments(done) {
  fs.readJson(__dirname + "/.attachments.json", function(err, lastAttachmentTimes) {
    lastAttachmentTimes = lastAttachmentTimes || {};
    log.info('last attachment times', lastAttachmentTimes);

    async.each(
      events,
      function(event, done) {
        log.info('pushing attachments for event ' + event.name);

        const observationMatch = { esriId: { "$exists": true } };
        const lastTime = lastAttachmentTimes[event.collectionName];
        if (lastTime) {
          observationMatch['attachments.lastModified'] = { "$gt": moment(lastTime).toDate() };
        }

        const project = { "$project": { esriId: true, lastModified: true, attachments: true } };
        const unwind = { "$unwind": "$attachments" };
        const sort = { "$sort": { "attachments.lastModified": 1 } };
        Observation.observationModel(event).aggregate([{"$match": observationMatch}], project, sort, unwind, function(err, aggregate) {
          if (err) return done(err);
          log.info(aggregate.length + ' have changed');

          async.each(
            aggregate,
            function(observation, done) {
              if (observation.attachments.esriId) {
                updateEsriAttachment(observation.esriId, observation.attachments, function(err) {
                  if (err) {
                    log.error('error updating ESRI attachment', err);
                  }
                  done();
                });
              } else {
                createEsriAttachment(observation.esriId, observation.attachments, function(err, esriAttachmentId) {
                  if (err) {
                    log.error('error creating ESRI attachment', err);
                    return done();
                  }

                  const condition = { _id: observation._id, 'attachments._id': observation.attachments._id };
                  const update = { '$set': { 'attachments.$.esriId': esriAttachmentId } };
                  Observation.observationModel(event).update(condition, update, done);
                });
              }
            },
            function(err) {
              if (aggregate.length > 0) {
                lastAttachmentTimes[event.collectionName] = aggregate[aggregate.length - 1].attachments.lastModified;
              }
              done(err);
            }
          );
        });
      },
      function(err) {
        log.info('done with attachment push', err);
        if (!err) {
          fs.writeJson(__dirname + "/.attachments.json", lastAttachmentTimes, done);
        }
      }
    );
  });
}

function push() {
  log.info('pushing attachments to esri server ' + moment().toISOString());

  async.series(
    { events: getEvents, observations: pushAttachments },
    function(err) {
      if (err) log.error('Error pushing attachments to esri server', err);

      log.info('finished pushing all attachments to esri server ' + moment().toISOString());
      setTimeout(push, timeout);
    }
  );
}

push();
