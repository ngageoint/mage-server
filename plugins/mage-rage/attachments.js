var config = require('./config.json')
  , serverConfig = require('../../config.json')
  , async = require('async')
  , crypto = require('crypto')
  , async = require('async')
  , request = require('request')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , User = require('../models/user')
  , Device = require('../models/device')
  , Layer = require('../models/layer')
  , Feature = require('../models/feature')
  , Location = require('../models/location')
  , api = require('../api')
  , path = require('path')
  , fs = require('fs-extra');

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

var timeout = config.attachments.interval * 1000;

var username = config.credentials.username;
var p***REMOVED***word =  config.credentials.p***REMOVED***word;
var uid =  config.credentials.uid;

var baseUrl = config.baseUrl;
var token;

var lastAttachmentTime = {};
var lastFeatureTime = {};

var featureLayers;

var headers = {};

var getToken = function(done) {
  console.log('getting token');

  var options = {
    url: baseUrl + '/api/login',
    json: {
      username: username,
      uid: uid,
      p***REMOVED***word: p***REMOVED***word
    }
  };

  request.post(options, function(err, res, body) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error hitting login api, respose code: ' + res.statusCode));
    token = body.token;
    headers['Authorization'] = 'Bearer ' + body.token;
    done();
  });
}

var getLastAttachmentSyncTime = function(done) {
  fs.readJson("rage/.attachment_sync.json", function(err, readInLastAttachmentTime) {
    lastAttachmentTime = readInLastAttachmentTime || {};
    lastFeatureTime = lastAttachmentTime;
    console.log('last', lastAttachmentTime);
    done();
  });

}

var getAllFeatureLayers = function(callback) {
  Layer.getLayers(function (err, layers) {
    // filter out non feature layers
    featureLayers = [];
    featureLayers = layers.filter(function(layer) {
      return layer.type == "Feature";
    });
    console.info('Syncing features for ' + featureLayers.length + ' layers');
    callback();
  });
}

var getFeaturesSince = function(startTime, layer, callback) {
  var options = {	};

  if (startTime) {
    var startTimePlusOne = moment(startTime).add('ms', 1);

    options.filter = {
      startDate: startTimePlusOne.toDate()
    };
  }
  console.info('Getting features for layer ', layer);
  new api.Feature(layer).getAll(options, callback);
}


var getAttachmentsFromFeature = function(feature) {
  return feature.attachments || [];
}

var sortFeaturesByTimestamp = function(features) {
  return features.sort(function(a, b) {
    if (moment(a.properties.timestamp).isBefore(b.properties.timestamp))
       return 1;
    if (moment(a.properties.timestamp).isAfter(b.properties.timestamp))
       return -1;
    // a must be equal to b
    return 0;
  });
}

var writeLastSyncTime = function(done) {
  fs.writeJson("rage/.attachment_sync.json", lastFeatureTime, done);
}

var appendErrorFile = function(string) {
  fs.writeJson("rage/.attachment_sync_errors.json", string);
}

// if this feature time is newer than we currently have
// update the last feature time
var updateLastFeatureTime = function(feature, layer) {
  if (feature.properties.timestamp) {
    var featureTime = moment(feature.properties.timestamp);
    if (!lastFeatureTime[layer.collectionName] || (featureTime.isAfter(lastFeatureTime[layer.collectionName]) && featureTime.isBefore(Date.now()))) {
      lastFeatureTime[layer.collectionName] = featureTime;
    }
  }
}

var sequentiallySyncAttachments = function(features, layer, done) {

  console.info('syncing layer ' + layer.name);
  console.info('Sequentially syncing for ' + features.length + ' features');

  async.eachSeries(features, function(feature, done) {

    // get the attachments
    var attachments = getAttachmentsFromFeature(feature);

    var localDone = done;

    // sync each attachment
    pullAttachmentsCallbackWhenComplete(feature, layer, attachments, function(err) {
      if (!err) {
        console.info('successfully synced attachments for feature ' + feature.id + ' time is: ' + feature.properties.timestamp);
        updateLastFeatureTime(feature, layer);
      }
      localDone(err);
    });

  }, function(err) {
    done();
  });
}

var pullAttachmentsCallbackWhenComplete = function(feature, layer, attachments, callback) {
  console.info("syncing " + attachments.length + " attachments");
  async.eachSeries(feature.attachments, function(attachment, done) {

    var url = baseUrl + '/FeatureServer/'+
      layer.id + '/features/' +
      feature.id + '/attachments/' +
      attachment._id + '?access_token=' + token;
    var r = request(url);
    r.on('response', function (resp) {
      console.info('attachment response status code is ' + resp.statusCode);
      if (resp.statusCode == 200) {
        fs.mkdirsSync(path.dirname(config.attachmentBase + '/' + attachment.relativePath));
        r.pipe(fs.createWriteStream(config.attachmentBase + '/' + attachment.relativePath));
        console.info('write the file for url ' + url + ' to ' + config.attachmentBase + '/' + attachment.relativePath);
        attachment.set("synced", Date.now(), {strict: false});
        feature.save(function(err) {
          // who cares
        });
        done();
      } else if (resp.statusCode == 404) {
        // uhhh no data, hmmm
        console.info('no data for ' + url);
        appendErrorFile(JSON.stringify({
          url:baseUrl + '/FeatureServer/'+
          layer.id + '/features/' +
          feature.id + '/attachments/' +
          attachment._id, localFile: config.attachmentBase + '/' + attachment.relativePath
        }));
        done();
      } else {
        console.info('failed to sync with error code ' + resp.statusCode + ' url is ' + url);
        done(new Error('something bad happend'));
      }
    });
    r.on('error', function(resp) {
      done(new Error('more bad stuff happened'));
    });
  },
  function(err) {
    console.info(' error ', err);
    callback(err);
  });
}

var syncAttachments = function(done) {

  // global featureLayers is all the layers
  // loop the layers, get all the features for each layer then pull the
  // attachments for each feature

  async.eachSeries(featureLayers,
    function(layer, done) {
      console.log('syncing attachments since ' + lastAttachmentTime[layer.collectionName]);
      // use that time to get the features since then
      var featuresToSync;
      getFeaturesSince(lastAttachmentTime[layer.collectionName], layer, function(features) {
        featuresToSync = features;
        console.log("features to sync is " + featuresToSync.length);
        // sort the features by timestamp
        featuresToSync = sortFeaturesByTimestamp(featuresToSync);

        sequentiallySyncAttachments(featuresToSync, layer, done);
      });
    },
    function(err) {
      done();
    }
  );
}

var sync = function() {
  var token;

  console.log('pulling attachments ' + moment().toISOString());

  async.series({
    lastTime: getLastAttachmentSyncTime,
    token: getToken,
    layers: getAllFeatureLayers,
    attachments: syncAttachments
  },
  function(err, results) {
  console.log('finished pulling attachments ' + moment().toISOString());
    writeLastSyncTime();
    setTimeout(sync, timeout);
  });
}

sync();
