module.exports = function(config) {
  var fs = require('fs-extra')
    , crypto = require('crypto')
    , async = require('async')
    , rest = require('restler')
    , mongoose = require('mongoose')
    , moment = require('moment')
    , User = require('../models/user').User
    , Device = require('../models/device').Device
    , Layer = require('../models/layer').Layer
    , Feature = require('../models/feature')
    , Location = require('../models/location').Location;

  var timeout = 5000000;
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

    var jsonData = { username: username, uid: uid, p***REMOVED***word: p***REMOVED***word };
    rest.postJson(baseUrl + '/api/login', jsonData)
      .on('complete', function(data, response) {
        headers['Authorization'] = 'Bearer ' + data.token;
        done(null);
      })
      .on('fail', function(data, response) {
        done(new Error('Response failed, could not get token'));
      });
  }

  var syncUsers = function(done) {
    rest.json(baseUrl + '/api/users', {}, {headers: headers})
      .on('success', function(users, response) {
        console.log('syncing: ' + users.length + ' users');
        async.each(users,
          function(user, done) {
            var id = user._id;
            delete user._id;
            User.findOneAndUpdate({username: user.username}, user, {upsert: true}, done);
          },
          function(err) {
            done(err);
          }
        );
      })
     .on('fail', function(data, response) {
        done(new Error('Response failed, could not sync users'));
      });
  }

  var syncDevices = function(done) {
    rest.json(baseUrl + '/api/devices', {}, {headers: headers})
      .on('success', function(devices, response) {
        console.log('syncing: ' + devices.length + ' devices');
        async.each(devices,
          function(device, done) {
            var id = device._id;
            delete device._id;
            Device.findOneAndUpdate({uid: device.uid}, device, {upsert: true}, done);
          },
          function(err) {
            done(err);
          }
        );
      })
     .on('fail', function(data, response) {
        done(new Error('Request failed, could not sync devices'));
      });
  }

  var createFeatureCollection = function(layer) {
    console.log("Creating collection: " + layer.collectionName + ' for layer ' + layer.name);
    mongoose.connection.db.createCollection(layer.collectionName, function(err, collection) {
      if (err) {
        console.error(err);
        return;
      } 
        
      console.log("Successfully created feature collection for layer " + layer.name);
    });
  }

  var layers;
  var syncLayers = function(done) {
    rest.json(baseUrl + '/api/layers', {}, {headers: headers})
      .on('success', function(data, response) {
        console.log('syncing: ' + data.length + ' layers');
        layers = [];
        async.each(data.filter(function(l) { return l.type === 'Feature' }),
          function(featureLayer, done) {
            var layer =  {name: featureLayer.name, type: featureLayer.type, collectionName: 'features' + featureLayer.id};
            Layer.findOneAndUpdate({id: featureLayer.id}, layer, {upsert: true, new: false}, function(err, oldLayer) {
              if (!oldLayer.id) {
                createFeatureCollection(layer);
              }

              layer.id = featureLayer.id;
              layers.push(layer);
              done(err);
            });
          },
          function(err) {
            done(err);
          }
        );
      })
      .on('fail', function(data, response) {
        done(new Error('Request failed, could not sync layers'));
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

          rest.json(url, {}, {headers: headers})
            .on('success', function(data, response) {
              console.log('syncing: ' + data.features.length + ' features');
              async.each(data.features,
                function(feature, done) {
                  feature.properties = feature.properties || {};
                  console.log('')
                  if (feature.properties.timestamp) {
                    console.log('feature date', feature.properties.timestamp);
                    var featureTime = moment(feature.properties.timestamp);
                    console.log('feature date convert', featureTime);
                    if (!lastTime || featureTime.isAfter(lastTime)) {
                      lastTime = featureTime;
                    }
                  }

                  var id = feature.id;
                  delete feature.id;
                  Feature.featureModel(layer).findByIdAndUpdate(id, feature, {upsert: true}, done);
                },
                function(err) {
                  lastFeatureTimes[layer.collectionName] = lastTime;
                  done(err);
                }
              );
            })
            .on('fail', function(data, response) {
              done(new Error('Request failed, could not sync features'));
            });

        },
        function(err) {
          fs.writeJson("rage/.data_sync.json", lastFeatureTimes, done); 
        }
      );
    });
  }

  var syncLocations = function(done) {
    fs.readJson("rage/.locations_sync.json", function(err, lastLocationTime) {

      var url = baseUrl + '/api/locations?limit=100001';

      if (lastLocationTime) {
        url += '?startDate=' + moment(lastLocationTime).add('ms', 1).toISOString();
        lastLocationTime = moment(lastLocationTime);
      }
      console.log('location url is', url);

      rest.json(url, {}, {headers: headers})
        .on('success', function(data, response) {
          console.log('syncing: ' + data.length + ' locations');

          async.each(users,
            function(user, done) {
              var locations = user.locations;
              if (locations && locations.length > 0) {
                var lastTime = locations[locations.length - 1].properties.timestamp;
                if (lastLocationTime.isBefore(lastTime)) {
                  lastLocationTime = moment(lastTime);
                }
              }

              syncUserLocations(user, done);
            },
            function(err) {
              if (err) return done(err);

              fs.writeJson("rage/.locations_sync.json", lastLocationTime, done); 
            }
          );
        })
        .on('fail', function(data, response) {
          done(new Error('Request failed, could not sync layers'));
        });
    });
  }

  var syncUserLocations = function(user, done) {
    async.parllel({
      locationCollection: function(done) {
        // throw all this users locations in the location collection
        Location.create(user.locations, done);
      },
      userCollection: function(done) {
        // Also need to update the user location
      }
    },
    function(err, results) {
      done(err);
    });
  }

  var sync = function() {
    console.log('pulling data');

    // pull times

    async.series({
      token: getToken,
      users: syncUsers,
      devices: syncDevices,
      layers: syncLayers,
      features: syncFeatures,
      locations: syncLocations
    },
    function(err, results) {
      console.log('finished pulling all data, err', err);
      // done write times


      // results is now equal to: {token: 1, users: 2, etc...}

      setTimeout(sync, timeout);
    });
  };

  sync();
}