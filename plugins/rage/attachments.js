var config = require('./config.js')
  , log = require('winston')
  , environment = require('../environment/env')
  , async = require('async')
  , request = require('request')
  , moment = require('moment')
  , Event = require('../../models/event')
  , Observation = require('../../models/observation')
  , api = require('../../api')
  , path = require('path')
  , fs = require('fs-extra');

module.exports = {
  sync: sync
};

function sync(token, callback) {
  log.info('pulling attachments ' + moment().toISOString());
  request = request.defaults({
    json: true,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  async.series({
    lastTime: getLastAttachmentSyncTime,
    events: getEvents,
    attachments: syncAttachments
  },
  function(err) {
    log.info('finished pulling attachments ' + moment().toISOString());
    writeLastSyncTime();
    callback(err);
  });
}

var attachmentBase = environment.attachmentBaseDirectory;

var baseUrl = config.url;

var lastAttachmentTime = {};
var lastObservationTime = {};

var events;

function getLastAttachmentSyncTime(done) {
  fs.readJson(__dirname + "/.attachment.json", function(err, readInLastAttachmentTime) {
    lastAttachmentTime = readInLastAttachmentTime || {};
    lastObservationTime = lastAttachmentTime;
    log.info('last', lastAttachmentTime);
    done();
  });

}

function getEvents(callback) {
  Event.getEvents(function (err, allEvents) {
    events = allEvents;
    log.info('Syncing attachments for ' + events.length + ' events');
    callback();
  });
}

function getObservationsSince(startTime, event, callback) {
  var options = {	};

  if (startTime) {
    var startTimePlusOne = moment(startTime).add('ms', 1);

    options.filter = {
      startDate: startTimePlusOne.toDate()
    };
  }
  log.info('Getting observations for event ', event.name);
  new api.Observation(event).getAll(options, callback);
}


function getAttachmentsFromObservation(observation) {
  return observation.attachments || [];
}

function sortObservationsByTimestamp(observations) {
  return observations.sort(function(a, b) {
    if (moment(a.properties.timestamp).isBefore(b.properties.timestamp)) {
      return 1;
    }
    if (moment(a.properties.timestamp).isAfter(b.properties.timestamp)) {
      return -1;
    }

    return 0;
  });
}

function writeLastSyncTime(done) {
  fs.writeJson(__dirname + "/.attachment.json", lastObservationTime, done);
}

function appendErrorFile(string) {
  fs.writeJson(__dirname + "/.attachment_errors.json", string);
}

// if this observation time is newer than we currently have
// update the last observation time
function updateLastObservationTime(observation, event) {
  if (observation.properties.timestamp) {
    var observationTime = moment(observation.properties.timestamp);
    if (!lastObservationTime[event.collectionName] || (observationTime.isAfter(lastObservationTime[event.collectionName]) && observationTime.isBefore(Date.now()))) {
      lastObservationTime[event.collectionName] = observationTime;
    }
  }
}

function sequentiallySyncAttachments(observations, event, done) {

  log.info('syncing event ' + event.name);
  log.info('Sequentially syncing for ' + observations.length + ' observations');

  async.eachSeries(observations, function(observation, done) {

    // get the attachments
    var attachments = getAttachmentsFromObservation(observation);

    var localDone = done;

    // sync each attachment
    pullAttachmentsCallbackWhenComplete(observation, event, attachments, function(err) {
      if (!err) {
        log.info('successfully synced attachments for observation ' + observation.id + ' time is: ' + observation.properties.timestamp);
        updateLastObservationTime(observation, event);
      }
      localDone(err);
    });

  }, function(err) {
    done(err);
  });
}

function pullAttachmentsCallbackWhenComplete(observation, event, attachments, callback) {
  log.info("syncing " + attachments.length + " attachments");
  async.eachSeries(observation.attachments, function(attachment, done) {

    var url = baseUrl + '/api/events/'+ event.id + '/observations/' + observation._id + '/attachments/' + attachment._id;
    var r = request(url);
    r.on('response', function (resp) {
      log.info('attachment response status code is ' + resp.statusCode);
      if (resp.statusCode === 200) {
        fs.mkdirsSync(path.dirname(attachmentBase + '/' + attachment.relativePath));
        r.pipe(fs.createWriteStream(attachmentBase + '/' + attachment.relativePath));
        log.info('write the file for url ' + url + ' to ' + attachmentBase + '/' + attachment.relativePath);

        Observation.observationModel(event).update({_id: observation._id, 'attachments._id': attachment._id}, {'attachments.$.synced': Date.now()}, function() {
            // who cares
        });

        done();
      } else if (resp.statusCode === 404) {
        // uhhh no data, hmmm
        log.error('no data for ' + url);
        appendErrorFile(JSON.stringify({
          url:baseUrl + '/api/events/'+
          event.id + '/observations/' +
          observation.id + '/attachments/' +
          attachment._id, localFile: attachmentBase + '/' + attachment.relativePath
        }));
        done();
      } else {
        log.error('failed to sync with error code ' + resp.statusCode + ' url is ' + url);
        log.error('response was', resp);
        done(new Error('something bad happend'));
      }
    });
    r.on('error', function() {
      done(new Error('more bad stuff happened'));
    });
  },
  function(err) {
    callback(err);
  });
}

function syncAttachments(done) {

  // global events is all the events
  // loop the events, get all the observations for each event then pull the
  // attachments for each observation

  async.eachSeries(events, function(event, done) {
    log.info('syncing attachments since ' + lastAttachmentTime[event.collectionName]);
    // use that time to get the observations since then
    var observationsToSync;
    getObservationsSince(lastAttachmentTime[event.collectionName], event, function(err, observations) {
      observationsToSync = observations;
      log.info("observations to sync is " + observationsToSync.length);
      // sort the observations by timestamp
      observationsToSync = sortObservationsByTimestamp(observationsToSync);

      sequentiallySyncAttachments(observationsToSync, event, done);
    });
  },
  function(err) {
    done(err);
  });
}
