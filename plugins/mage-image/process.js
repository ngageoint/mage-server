var config = require('./config.js')
	, log = require('../../logger')
	, serverConfig = require('../../config.js')
	, async = require('async')
	, path = require('path')
	, fs = require('fs-extra')
	, mongoose = require('mongoose')
	, Event = require('../../models/event')
	, Observation = require('../../models/observation')
	, gm = require('gm');

var attachmentBase = serverConfig.server.attachment.baseDirectory;
var thumbSizes = config.image.thumbSizes;

var timeout = config.image.interval * 1000;

var observationTimes = {};
var lastObservationTimes = {orient: {}, thumbnail: {}};

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

function processEvent(options, callback) {
  async.eachSeries(options.observations, function(observation, done) {
    processAttachment(options.event, observation._id, observation.attachment, done);
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

  var file = path.join(attachmentBase, attachment.relativePath);
  var outputFile =  file + "_orient";
  log.info("file", file);

  var start = new Date().valueOf();
  gm(file).autoOrient().write(outputFile, function(err) {
    if (err) return callback(err);

    var end = new Date().valueOf();
    log.info("orientation of attachment " + attachment.name + " complete in " + (end - start)/1000 + " seconds");
    fs.rename(outputFile, file, function(err) {
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
  var file = path.join(attachmentBase, attachment.relativePath);

  async.eachSeries(thumbSizes, function(thumbSize, done) {
    var containsThumbnail = attachment.thumbnails.some(function(thumbnail) {
      return thumbnail.minDimension === thumbSize;
    });
    if (containsThumbnail) return done();

    var thumbPath = path.join(path.dirname(file), path.basename(file, path.extname(file))) + "_" + thumbSize + path.extname(file);

    var thumbWidth = attachment.width <= attachment.height ? thumbSize : null;
    var thumbHeight = attachment.height < attachment.width ? thumbSize : null;

    if (!thumbWidth) thumbWidth = Math.ceil((thumbHeight / attachment.height) * attachment.width);
    if (!thumbHeight) thumbHeight = Math.ceil((thumbWidth / attachment.width) * attachment.height);

    if (thumbWidth > attachment.width || thumbHeight > attachment.height) return done();

    log.info('thumbnailing attachment ' + attachment.name + ' for size ' + thumbSize);
    var start = new Date().valueOf();
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
          var end = new Date().valueOf();
          log.info('Finished thumbnailing ' + thumbSize + " in " + (end - start)/1000 + " seconds");

          var stat = fs.statSync(thumbPath);

          Observation.addAttachmentThumbnail(event, observationId, attachment._id, {
            size: stat.size,
            name: path.basename(attachment.name, path.extname(attachment.name)) + "_" + thumbSize + path.extname(attachment.name),
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

var processAttachments = function() {
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
      var results = [];
      async.eachSeries(events, function(event, done) {
        var match = {
          "attachments.contentType": { "$regex": /^image/ },
          "attachments.oriented": false
        };

        var lastTime = lastObservationTimes.orient[event.collectionName];
        if (lastTime) {
          match.lastModified = {"$gt": lastTime};
        }

        var sort = {"$sort": { "lastModified": 1 }};
        var unwind = {"$unwind": "$attachments"};
        var project = {"$project": {lastModified: 1, attachment: "$attachments"}};
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
      var results = [];
      async.eachSeries(events, function(event, done) {
        var match =  {
          "attachments.contentType": { "$regex": /^image/ },
          "attachments.oriented": true,
          "attachments.thumbnails.minDimension": { "$not": { "$all": thumbSizes } }
        };

        var lastTime = lastObservationTimes.thumbnail[event.collectionName];
        if (lastTime) {
          match.lastModified = {"$gt": lastTime};
        }

        var sort = {"$sort": { "lastModified": 1 }};
        var unwind = {"$unwind": "$attachments"};
        var project = {"$project": {lastModified: 1, attachment: "$attachments"}};
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
