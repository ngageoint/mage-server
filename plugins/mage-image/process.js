const config = require('./config.json')
  , log = require('../../logger')
  , environment = require('../../environment/env')
  , async = require('async')
  , path = require('path')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , Event = require('../../models/event')
  , Observation = require('../../models/observation')
  , gm = require('gm');

const attachmentBase = environment.attachmentBaseDirectory;
const thumbSizes = config.image.thumbSizes;

const timeout = config.image.interval * 1000;

const observationTimes = {};
const lastObservationTimes = {orient: {}, thumbnail: {}};

const mongo = environment.mongo;
mongoose.connect(mongo.uri, mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodb is running...');
    throw err;
  }
});

const mongooseLogger = log.loggers.get('mongoose');
mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%j, %j, %j)", collection, method, query, doc, options);
});

process.on('disconnect', function() {
  log.info('Image plugin orphaned, parent process disconnected. Shutting down...');
  process.exit();
});

function processEvent(options, callback) {
  async.eachSeries(options.observations, function(observation, done) {
    async.nextTick(function() {
      processAttachment(options.event, observation._id, observation.attachment, done);
    });
  },
  function(err) {
    callback(err);
  });
}

function processAttachment(event, observationId, attachment, callback) {
  if (attachment.oriented) {
    thumbnail(event, observationId, attachment, callback);
  } else {
    orient(event, observationId, attachment, callback);
  }
}

function orient(event, observationId, attachment, callback) {
  log.info('orient attachment ' + attachment.name);

  const file = path.join(attachmentBase, attachment.relativePath);
  const outputFile =  file + "_orient";
  log.info("file", file);

  const start = new Date().valueOf();

  gm(file).out('-auto-orient').write(outputFile, function(err) {
    if (err) return callback(err);

    const end = new Date().valueOf();
    log.info("orientation of attachment " + attachment.name + " complete in " + (end - start)/1000 + " seconds");
    fs.move(outputFile, file, {overwrite: true}, function(err) {
      if (err) return callback(err);

      gm(file).size(function(err, size) {
        var stat = fs.statSync(file);
        attachment.size = stat.size;
        attachment.width = size.width;
        attachment.height = size.height;
        attachment.oriented = true;
        Observation.updateAttachment(event, observationId, attachment._id, attachment, function(err) {
          callback(err);
        });
      });
    });
  });
}

function thumbnail(event, observationId, attachment, callback) {
  const file = path.join(attachmentBase, attachment.relativePath);

  async.eachSeries(thumbSizes, function(thumbSize, done) {
    const containsThumbnail = attachment.thumbnails.some(function(thumbnail) {
      return thumbnail.minDimension === thumbSize;
    });
    if (containsThumbnail) return done();

    const thumbPath = path.join(path.dirname(file), path.basename(file, path.extname(file))) + "_" + thumbSize + path.extname(file);

    let thumbWidth = attachment.width <= attachment.height ? thumbSize : null;
    let thumbHeight = attachment.height < attachment.width ? thumbSize : null;

    if (!thumbWidth) thumbWidth = Math.ceil((thumbHeight / attachment.height) * attachment.width);
    if (!thumbHeight) thumbHeight = Math.ceil((thumbWidth / attachment.width) * attachment.height);

    if (thumbWidth > attachment.width || thumbHeight > attachment.height) return done();

    log.info('thumbnailing attachment ' + attachment.relativePath + ' for size ' + thumbSize);
    const start = new Date().valueOf();
    gm(file)
      .in("-size")
      .in(thumbWidth * 2 + "x" + thumbHeight * 2)
      .resize(thumbWidth, thumbHeight).write(thumbPath, function(err) {
        if (err) {
          log.error('Error thumbnailing file to size: ' + thumbSize, err);
          callback(err);
          return;
        } else {
          // write to mongo
          const end = new Date().valueOf();
          log.info('Finished thumbnailing ' + thumbSize + " in " + (end - start)/1000 + " seconds");

          const stat = fs.statSync(thumbPath);
          
          Observation.addAttachmentThumbnail(event, observationId, attachment._id, {
            size: stat.size,
            name: path.basename(attachment.relativePath, path.extname(attachment.relativePath)) + "_" + thumbSize + path.extname(attachment.relativePath),
            relativePath: path.join(path.dirname(attachment.relativePath), path.basename(attachment.relativePath, path.extname(attachment.relativePath))) + "_" + thumbSize + path.extname(attachment.relativePath),
            contentType: attachment.contentType,
            minDimension: thumbSize,
            height: thumbHeight,
            width: thumbWidth
          },
          function(err) {
            if (err) log.error('error writing thumb to db', err);

            log.info('thumbnailing wrote thumb metadata to db');

            done(err);
          });
        }
      });
  }, function(err) {
    if (err) {
      log.error('error thumbnailing', err);
    } else {
      log.info('Finished thumbnailing ' + attachment.name);
    }
    callback(err);
  });
}

const processAttachments = function() {
  log.info('processing attachments, starting from', lastObservationTimes);

  async.waterfall([
    function(done) {
      //get events
      Event.getEvents(function(err, events) {
        async.each(events, function(event, done) {
          Observation.getLatestObservation(event, function(err, observation) {
            if (err) return done(err);

            if (observation) observationTimes[event.collectionName] = observation.lastModified;
            done();
          });
        },
        function(err) {
          done(err, events);
        });
      });
    },
    function(events, done) {
      // aggregate results into array of attachments that have not been oriented, and orient
      const results = [];
      async.eachSeries(events, function(event, done) {
        const match = {
          'attachments.relativePath': { 'exists': true },
          'attachments.contentType': { '$regex': /^image/ },
          'attachments.oriented': false
        };

        const lastTime = lastObservationTimes.orient[event.collectionName];
        if (lastTime) {
          match.lastModified = {"$gt": lastTime};
        }

        const sort = {"$sort": { "lastModified": 1 }};
        const unwind = {"$unwind": "$attachments"};
        const project = {"$project": {lastModified: 1, attachment: "$attachments"}};
        Observation.observationModel(event).aggregate({"$match": match}, sort, unwind, {"$match": match}, project, function(err, aggregate) {
          results.push({event: event, observations: aggregate});
          done(err);
        });
      },
      function(err) {
        done(err, events, results);
      });
    },
    function(events, results, done) {
      async.eachSeries(results, function(result, done) {
        processEvent(result, function(err) {
          // Update time
          lastObservationTimes.orient[result.event.collectionName] = observationTimes[result.event.collectionName];
          done(err);
        });
      },
      function(err) {
        done(err, events);
      });
    },
    function(events, done) {
      // aggregate results into array of attachments that have been oriented
      // but do no have all the nessecary thumbnails
      const results = [];
      async.eachSeries(events, function(event, done) {
        const match =  {
          "attachments.contentType": { "$regex": /^image/ },
          "attachments.oriented": true,
          "attachments.thumbnails.minDimension": { "$not": { "$all": thumbSizes } }
        };

        const lastTime = lastObservationTimes.thumbnail[event.collectionName];
        if (lastTime) {
          match.lastModified = {"$gt": lastTime};
        }

        const sort = {"$sort": { "lastModified": 1 }};
        const unwind = {"$unwind": "$attachments"};
        const project = {"$project": {lastModified: 1, attachment: "$attachments"}};
        Observation.observationModel(event).aggregate({"$match": match}, sort, unwind, {"$match": match}, project, function(err, aggregate) {
          results.push({event: event, observations: aggregate});
          done(err);
        });
      },
      function(err) {
        done(err, events, results);
      });
    },
    function(events, results, done) {
      async.eachSeries(results, function(result, done) {
        processEvent(result, function(err) {
          if (err) return done(err);

          // Update time
          lastObservationTimes.thumbnail[result.event.collectionName] = observationTimes[result.event.collectionName];
          done();
        });
      },
      function(err) {
        done(err, events);
      });
    }
  ],
  function(err) {
    if (err) log.error('error processing images', err);

    log.info('done processing attachments');

    setTimeout(processAttachments, timeout);
  });
};

processAttachments();
