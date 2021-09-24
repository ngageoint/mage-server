var log = require('../../logger')
  , config = require('./config.json')
  , environment = require('../environment/env')
  , async = require('async')
  , request = require('request')
  , path = require('path')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , moment = require('moment')
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

var attachmentBase = environment.attachmentBaseDirectory;
var timeout = config.esri.attachments.interval * 1000;
var url = [url.host, url.site, url.restServices, url.folder, url.serviceName, url.serviceType, url.layerId].join("/");

var events;
function getEvents(done) {
  Event.getEvents(function(err, allEvents) {
    events = allEvents;
    done(err);
  });
}

function createEsriAttachment(esriId, attachment, callback) {
  log.info('creating new attachment ' + esriId);

  var attachmentUrl = [url, esriId, "addAttachment"].join("/") + "?f=json";
  log.info('sending', attachmentUrl);
  var r = request.post({url: attachmentUrl}, function(err, res, body) {
    if (err) return callback(err);

    var json = JSON.parse(body);
    log.info('ESRI observation add response', json);

    if (res.code !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    var result = json.addAttachmentResult;
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ', result.error));
    }

    callback(null, result.objectId);
  });

  var file = path.join(attachmentBase, attachment.relativePath);
  var form = r.form();
  form.append('attachment', fs.createReadStream(file));
}

function updateEsriAttachment(esriId, attachment, callback) {
  log.info('updating attachment ' + esriId);

  var attachmentUrl = [url, esriId, "updateAttachment"].join("/") + "?f=json";
  log.info('sending attachment to ESRI', attachmentUrl);
  var r = request.post({url: attachmentUrl}, function(err, res, body) {
    if (err) return callback(err);

    var json = JSON.parse(body);
    log.info('ESRI observation update response', json);

    if (res.statusCode !== 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
    var result = json.updateAttachmentResult;
    if (!result.success) {
      return callback(new Error('Error sending ESRI json ', result.error));
    }

    callback(null);
  });

  var file = path.join(attachmentBase, attachment.relativePath);
  var form = r.form();
  form.append('attachment', fs.createReadStream(file));
  form.append('attachmentId', attachment.esriId);
}

function pushAttachments(done) {
  fs.readJson(__dirname + "/.attachments.json", function(err, lastAttachmentTimes) {
    lastAttachmentTimes = lastAttachmentTimes || {};
    log.info('last attachment times', lastAttachmentTimes);

    async.each(events,
      function(event, done) {
        log.info('pushing attachments for event ' + event.name);

        var observationMatch = { esriId: {"$exists": true} };
        var lastTime = lastAttachmentTimes[event.collectionName];
        if (lastTime) {
          observationMatch['attachments.lastModified'] = {"$gt": moment(lastTime).toDate()};
        }

        var project = {"$project": {esriId: true, lastModified: true, attachments: true}};
        var unwind = {"$unwind": "$attachments"};
        var sort = {"$sort": { "attachments.lastModified": 1 }};
        Observation.observationModel(event).aggregate({"$match": observationMatch}, project, sort, unwind, function(err, aggregate) {
          if (err) return done(err);
          log.info(aggregate.length + ' have changed');

          async.each(aggregate, function(observation, done) {
            if (observation.attachments.esriId) {
              updateEsriAttachment(observation.esriId, observation.attachments, function(err) {
                if (err) {
                  log.error('error updating ESRI attachment', err);
                }

                return done();
              });
            } else {
              createEsriAttachment(observation.esriId, observation.attachments, function(err, esriAttachmentId) {
                if (err) {
                  log.err('error creating ESRI attachment', err);
                  return done();
                }

                var condition = {_id: observation._id, 'attachments._id': observation.attachments._id};
                var update = { '$set': {'attachments.$.esriId': esriAttachmentId} };
                Observation.observationModel(event).update(condition, update, done);
              });
            }
          },
          function(err) {
            if (aggregate.length > 0) {
              lastAttachmentTimes[event.collectionName] = aggregate[aggregate.length - 1].attachments.lastModified;
            }

            done(err);
          });
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

  async.series({
    events: getEvents,
    observations: pushAttachments
  },
  function(err) {
    if (err) log.info('Error pushing attachments to esri server', err);

    log.info('finished pushing all attachments to esri server ' + moment().toISOString());
    setTimeout(push, timeout);
  });
}

push();
