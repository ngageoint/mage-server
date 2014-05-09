var config = require('./config.json')
  , serverConfig = require('../../config.json')
  , fs = require('fs-extra')
  , crypto = require('crypto')
  , async = require('async')
  , request = require('request')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , Counter = require('../../models/counter')
  , User = require('../../models/user')
  , Device = require('../../models/device')
  , Layer = require('../../models/layer')
  , Feature = require('../../models/feature')
  , Location = require('../../models/location');

// setup mongoose to talk to mongodb
var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
  if (err) {
    console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});
mongoose.set('debug', true);

var timeout = config.attachments.interval * 1000;

var username = config.credentials.username;
var p***REMOVED***word =  config.credentials.p***REMOVED***word;
var uid =  config.credentials.uid;

var baseUrl = config.url;

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

    headers['Authorization'] = 'Bearer ' + body.token;
    done();
  });
}

var syncUsers = function(done) {
  var options = {
    url: baseUrl + '/api/users',
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, users) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting users, respose code: ' + res.statusCode));

    console.log('syncing: ' + users.length + ' users');
    async.each(users,
      function(user, done) {
        var id = user._id;
        delete user._id;
        User.Model.findByIdAndUpdate(id, user, {upsert: true}, done);
      },
      function(err) {
        done(err);
      }
    );
  });
}

var syncDevices = function(done) {
  var options = {
    url: baseUrl + '/api/devices',
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, devices) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting devices, respose code: ' + res.statusCode));

    console.log('syncing: ' + devices.length + ' devices');
    async.each(devices,
      function(device, done) {
        var id = device._id;
        delete device._id;
        Device.Model.findByIdAndUpdate(id, device, {upsert: true}, done);
      },
      function(err) {
        done(err);
      }
    );
  });
}

var createFeatureCollection = function(layer, done) {
  console.log("Creating collection: " + layer.collectionName + ' for layer ' + layer.name);
  mongoose.connection.db.createCollection(layer.collectionName, function(err, collection) {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Successfully created feature collection for layer " + layer.name);
    done();
  });
}

var layers;
var syncLayers = function(done) {
  var options = {
    url: baseUrl + '/api/layers',
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, body) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting layers, respose code: ' + res.statusCode));

    layers = [];
    var featureLayers = body.filter(function(l) { return l.type === 'Feature' });
    console.log('syncing: ' + featureLayers.length + ' feature layers');
    async.each(featureLayers,
      function(featureLayer, done) {
        Counter.getNext('layer', function(id) {
          var layer =  {id: id, name: featureLayer.name, type: featureLayer.type, collectionName: 'features' + id};

          Layer.Model.findOneAndUpdate({_id: featureLayer.id}, layer, {upsert: true, new: false}, function(err, oldLayer) {
            if (!oldLayer || !oldLayer.id) {
              createFeatureCollection(layer, function() {
                layer.id = featureLayer.id;
                layers.push(layer);
                done(err);
              });
            } else {
              layer.id = featureLayer.id;
              layers.push(layer);
              done();
            }
          });
        });
      },
      function(err) {
        done(err);
      }
    );
  });
}

var syncFeatures = function(done) {
  console.log('syncing features for layers', layers);

  fs.readJson(__dirname + "/.data_sync.json", function(err, lastFeatureTimes) {
    lastFeatureTimes = lastFeatureTimes || {};
    console.log('last', lastFeatureTimes);

    async.each(layers,
      function(layer, done) {
        var url = baseUrl + '/FeatureServer/' + layer.id + "/features";
        var lastTime = lastFeatureTimes[layer.collectionName];

        if (lastTime) {
          url += '?startDate=' + moment(lastTime).add('ms', 1).toISOString();
          lastTime = moment(lastTime);
        }
        console.log('feature url is', url);
        var options = {
          url: url,
          json: true,
          headers: headers
        };

        request.get(options, function(err, res, body) {
          if (err) return done(err);

          if (res.statusCode != 200) return done(new Error('Error getting features, respose code: ' + res.statusCode));

          console.log('syncing: ' + body.features.length + ' features');
          async.each(body.features,
            function(feature, done) {
              feature.properties = feature.properties || {};
              console.log('')
              if (feature.lastModified) {
                var featureTime = moment(feature.lastModified);
                if (!lastTime || featureTime.isAfter(lastTime)) {
                  lastTime = featureTime;
                }
              }

              var id = feature.id;
              delete feature.id;
              if (feature.lastModified) feature.lastModified = moment(feature.lastModified).toDate();
              if (feature.attachments) {
                feature.attachments.forEach(function(attachment) {
                  attachment._id = attachment.id;
                  var id = mongoose.Types.ObjectId(attachment._id);
                  attachment.id = id.getTimestamp().getTime();
                });
              }

              Feature.featureModel(layer).findByIdAndUpdate(id, feature, {upsert: true}, done);
            },
            function(err) {
              lastFeatureTimes[layer.collectionName] = lastTime;
              done(err);
            }
          );
        });
      },
      function(err) {
        fs.writeJson(__dirname + "/.data_sync.json", lastFeatureTimes, done);
      }
    );
  });
}

function requestLocations(lastTime, done) {
  var url = baseUrl + '/api/locations?limit=1000';

  if (lastTime) {
    url += '&startDate=' + moment(lastTime).add('ms', 1).toISOString();
    lastTime = moment(lastTime);
  }
  console.log('location url is', url);

  var options = {
    url: url,
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, locations) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting layers, respose code: ' + res.statusCode));

    console.log('syncing locations for: ' + locations.length + ' locations ' + JSON.stringify(locations));
    async.each(locations, function(location) {
      var locationTime = moment(location.properties.timestamp);
      if (!lastTime || (lastTime.isBefore(locationTime) && locationTime.isBefore(Date.now()))) {
        lastTime = locationTime;
      }

      syncUserLocations(locations, done);
    },
    function(err) {
      if (err) return done(err);

      done(null, locations);
    });
  });
}

var syncLocations = function(done) {
  fs.readJson(__dirname + "/.locations_sync.json", function(err, lastLocationTimes) {
    lastLocationTimes = lastLocationTimes || {};
    var lastTime = lastLocationTimes.locations;

    var locations = [];
    async.doUntil(function() {locations.length == 0}, function(done) {
      requestLocations(lastTime, function(err, requestedLocations) {
        if (err) return done(err);
        locations = requestLocations;
      });
    },
    function(err) {
      if (err) return done(err);

      lastLocationTimes.location = lastTime;
      fs.writeJson(__dirname + "/.locations_sync.json", lastLocationTimes, done);
    });
  });
}

var syncUserLocations = function(locations, done) {
  async.parallel({
    locationCollection: function(done) {
      // throw all this users locations in the location collection
      async.each(locations, function(location, done) {
        var locationId = location._id;
        delete location._id;
        Location.Model.findByIdAndUpdate(locationId, location, {upsert: true}, function(err, location) {
          if (err) console.log('error inserting location into locations collection', err);
          done();
        });
      },
      function(err) {
        done();
      });
    },
    userCollection: function(done) {
      // Also need to update the user location, for now the web only needs one location from this list
      // just update the latest
      async.each(locations, function(location, done) {
        var locationId = location._id;
        delete location._id;
        User.addLocationsForUser({_id: location.properties.user}, [location], function(err) {
          done();
        });
      },
      function(err) {
        done();
      });
    }
  },
  function(err, results) {
    done(err);
  });
}

var syncFeaturesAndLocations = function(done) {
  async.parallel({
    // features: syncFeatures,
    locations: syncLocations
  },
  function(err, results) {
    done(err);
  });
}

var sync = function() {
  console.log('pulling data ' + moment().toISOString());

  async.series({
    token: getToken,
    users: syncUsers,
    devices: syncDevices,
    layers: syncLayers,
    featuresAndLocations: syncFeaturesAndLocations
  },
  function(err, results) {
    console.log('finished pulling all data ' + moment().toISOString());
    console.log('err: ', err);
    setTimeout(sync, timeout);
  });
};

sync();
