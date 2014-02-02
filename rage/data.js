module.exports = function(config) {
  var fs = require('fs-extra')
    , crypto = require('crypto')
    , async = require('async')
    , request = require('request')
    , mongoose = require('mongoose')
    , moment = require('moment')
    , User = require('../models/user')
    , Device = require('../models/device')
    , Layer = require('../models/layer')
    , Feature = require('../models/feature')
    , Location = require('../models/location');

  var timeout = 3000;
  var baseUrl = config.baseUrl;

  var username = 'df00d591feb2c5478db826dfb5199dbb';
  var p***REMOVED***word = 'df00d591feb2c5478db826dfb5199dbb';
  var uid = '0e748bc5d2bacdf167731d93e30c21fc';

  var cryptoAlgorithm = 'aes256';
  var decipher = crypto.createDecipher(cryptoAlgorithm, config.key);
  username = decipher.update(username, 'hex', 'utf8') + decipher.final('utf8');
  decipher = crypto.createDecipher(cryptoAlgorithm, config.key);
  p***REMOVED***word = decipher.update(p***REMOVED***word, 'hex', 'utf8') + decipher.final('utf8');
  decipher = crypto.createDecipher(cryptoAlgorithm, config.key);
  uid = decipher.update(uid, 'hex', 'utf8') + decipher.final('utf8');

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
          var layer =  {name: featureLayer.name, type: featureLayer.type, collectionName: 'features' + featureLayer.id};
          Layer.Model.findOneAndUpdate({id: featureLayer.id}, layer, {upsert: true, new: false}, function(err, oldLayer) {
            if (! oldLayer || !oldLayer.id) {
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
        },
        function(err) {
          done(err);
        }
      );
    });
  }

  var syncFeatures = function(done) {
    console.log('syncing features for layers', layers);

    fs.readJson("rage/.data_sync.json", function(err, lastFeatureTimes) {
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
                if (feature.properties.timestamp) {
                  var featureTime = moment(feature.properties.timestamp);
                  if (!lastTime || featureTime.isAfter(lastTime)) {
                    lastTime = featureTime;
                  }
                }

                var id = feature.id;
                delete feature.id;
                if (feature.properties.timestamp) feature.properties.timestamp = moment(feature.properties.timestamp).toDate();
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
          fs.writeJson("rage/.data_sync.json", lastFeatureTimes, done); 
        }
      );
    });
  }

  var syncLocations = function(done) {
    fs.readJson("rage/.locations_sync.json", function(err, lastLocationTimes) {
      lastLocationTimes = lastLocationTimes || {};

      var url = baseUrl + '/api/locations?limit=100001';

      var lastTime = lastLocationTimes.locations;
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

      request.get(options, function(err, res, users) {
        if (err) return done(err);

        if (res.statusCode != 200) return done(new Error('Error getting layers, respose code: ' + res.statusCode));

        console.log('syncing locations for: ' + users.length + ' users');

        async.each(users,
          function(user, done) {
            var locations = user.locations;

            if (locations && locations.length > 0) {
              var locationTime = moment(locations[0].properties.timestamp);
              if (!lastTime || lastTime.isBefore(locationTime)) {
                lastTime = locationTime;
              }
            }

            syncUserLocations(user, done);
          },
          function(err) {
            if (err) return done(err);

            lastLocationTimes.locations = lastTime;
            fs.writeJson("rage/.locations_sync.json", lastLocationTimes, done); 
          }
        );
      });
    });
  }

  var syncUserLocations = function(user, done) {
    async.parallel({
      locationCollection: function(done) {
        // throw all this users locations in the location collection
        if (user.locations.length > 0) Location.Model.create(user.locations, done);
      },
      userCollection: function(done) {
        // Also need to update the user location, for now the web only needs one location from this list
        // just update the latest
        User.addLocationsForUser({_id: user.user}, user.locations, function(err) {
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
      features: syncFeatures,
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
}