var config = require('./config.json')
  , serverConfig = require('../../config.json')
  , async = require('async')
  , request = require('request')
  , path = require('path')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , ArcGIS = require('terraformer-arcgis-parser')
  , Event = require('../../models/event')
  , Obsevation = require('../../models/observation');

// setup mongoose to talk to mongodb
var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});
mongoose.set('debug', true);

var attachmentBase = serverConfig.server.attachment.baseDirectory;
var timeout = config.esri.attachments.interval * 1000;
var url = config.esri.url;
var url = [url.host, url.site, url.restServices, url.folder, url.***REMOVED***Name, url.***REMOVED***Type, url.layerId].join("/");

var events;
function getEvents(done) {
  Event.getEvents(function(err, allEvents) {
    events = allEvents;
    done(err);
  });
}

function createEsriAttachment(esriId, attachment, callback) {
  console.log('creating new attachment ' + esriId)

  attachmentUrl = [url, esriId, "addAttachment"].join("/") + "?f=json";
  console.log('sending', attachmentUrl);
  var r = request.post({url: attachmentUrl}, function(err, res, body) {
    if (err) return done(err);
    var json = JSON.parse(body);
    console.log('ESRI observation add response', json);

    if (res.code != 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
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
  console.log('updating attachment ' + esriId)

  attachmentUrl = [url, esriId, "updateAttachment"].join("/") + "?f=json";
  console.log('sending attachment to ESRI', attachmentUrl);
  var r = request.post({url: attachmentUrl}, function(err, res, body) {
    if (err) return done(err);
    var json = JSON.parse(body);
    console.log('ESRI observation update response', json);

    if (res.statusCode != 200) return callback(new Error('Error sending ESRI json ' + res.statusCode));
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
    console.log('last attachment times', lastAttachmentTimes);

    async.each(events,
      function(event, done) {
        console.log('pushing attachments for event ' + event.name);

        var observationMatch = { esriId: {"$exists": true} };
        var lastTime = lastAttachmentTimes[event.collectionName];
        if (lastTime) {
          observationMatch['attachments.lastModified'] = {"$gt": moment(lastTime).toDate()}
        }

        var project = {"$project": {esriId: true, lastModified: true, attachments: true}};
        var unwind = {"$unwind": "$attachments"};
        var sort = {"$sort": { "attachments.lastModified": 1 }};
        Observation.observationModel(event).aggregate({"$match": observationMatch}, project, sort, unwind, function(err, aggregate) {
          if (err) return done(err);
          console.log(aggregate.length + ' have changed');

          async.each(aggregate, function(observation, done) {
            if (observation.attachments.esriId) {
              updateEsriAttachment(observation.esriId, observation.attachments, function(err, esriAttachmentId) {
                if (err) {
                  console.log('error updating ESRI attachment', err);
                }

                return done();
              });
            } else {
              createEsriAttachment(observation.esriId, observation.attachments, function(err, esriAttachmentId) {
                if (err) {
                  console.log('error creating ESRI attachment', err);
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
        console.log('done with attachment push', err);
        if (!err) {
          fs.writeJson(__dirname + "/.attachments.json", lastAttachmentTimes, done);
        }
      }
    );
  });
}

function push() {
  console.log('pushing attachments to esri server ' + moment().toISOString());

  async.series({
    events: getEvents,
    observations: pushAttachments
  },
  function(err, results) {
    if (err) console.log('Error pushing attachments to esri server', err);

    console.log('finished pushing all attachments to esri server ' + moment().toISOString());
    setTimeout(push, timeout);
  });
};

push();
