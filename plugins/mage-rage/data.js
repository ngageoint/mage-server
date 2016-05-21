var config = require('./config.json')
  , log = require('winston')
  , querystring = require('querystring')
  , os = require('os')
  , path = require('path')
  , fs = require('fs-extra')
  , async = require('async')
  , request = require('request')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , api = require('../../api')
  , User = require('../../models/user')
  , Device = require('../../models/device')
  , Event = require('../../models/event')
  , Team = require('../../models/team')
  , Layer = require('../../models/layer')
  , Feature = require('../../models/feature')
  , Observation = require('../../models/observation')
  , Location = require('../../models/location')
  , CappedLocation = require('../../models/cappedLocation');

module.exports = {
  sync: sync
};

function sync(token, callback) {
  log.info('pulling data ' + moment().toISOString());
  request = request.defaults({
    json: true,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  async.series({
    users: syncUsers,
    devices: syncDevices,
    events: syncEvents,
    icons: syncIcons,
    teams: syncTeams,
    layers: syncLayers,
    features: syncFeatures,
    observationsAndLocations: function(done) {
      async.parallel({
        observations: syncObservations,
        locations: syncLocations
      },
      function(err) {
        done(err);
      });
    }
  },
  function(err) {
    log.info('finished pulling all data ' + moment().toISOString());
    callback(err);
  });
}

var baseUrl = config.url;

function syncUsers(done) {
  request.get(baseUrl + '/api/users', function(err, res, users) {
    if (err) return done(err);

    if (res.statusCode !== 200) return done(new Error('Error getting users, respose code: ' + res.statusCode));

    log.info('syncing: ' + users.length + ' users');
    async.each(users, function(user, done) {
      user._id = user.id;
      delete user.id;
      User.Model.findByIdAndUpdate(user._id, user, {upsert: true, new: true}, done);
    },
    function(err) {
      done(err);
    });
  });
}

function syncDevices(done) {
  request.get(baseUrl + '/api/devices', function(err, res, devices) {
    if (err) return done(err);

    if (res.statusCode !== 200) return done(new Error('Error getting devices, respose code: ' + res.statusCode));

    log.info('syncing: ' + devices.length + ' devices');
    async.each(devices, function(device, done) {
      device._id = device.id;
      delete device.id;
      Device.Model.findByIdAndUpdate(device._id, device, {upsert: true, new: true}, done);
    },
    function(err) {
      done(err);
    });
  });
}

function syncTeams(done) {
  request.get(baseUrl + '/api/teams', function(err, res, teams) {
    if (err) return done(err);

    if (res.statusCode !== 200) return done(new Error('Error getting teams, respose code: ' + res.statusCode));

    log.info('syncing: ' + teams.length + ' teams');
    async.each(teams, function(team, done) {
      team._id = team.id;
      delete team.id;
      team.userIds = team.users.map(function(user) { return user.id; });
      Team.TeamModel.findByIdAndUpdate(team._id, team, {upsert: true, new: true}, done);
    },
    function(err) {
      done(err);
    });
  });
}

function createCollection(name, done) {
  log.info("Creating collection: " + name);
  mongoose.connection.db.createCollection(name, function(err) {
    if (err) return done(err);

    log.info("Successfully created collection " + name);
    done();
  });
}

var events;
function syncEvents(done) {
  events = [];
  request.get(baseUrl + '/api/events', function(err, res, allEvents) {
    if (err) return done(err);

    if (res.statusCode !== 200) return done(new Error('Error getting events, respose code: ' + res.statusCode));

    log.info('syncing: ' + allEvents.length + ' events');
    async.each(allEvents, function(event, done) {
      event._id = event.id;
      delete event.id;
      event.collectionName = 'observations' + event._id;
      event.teamIds = event.teams.map(function(team) { return mongoose.Types.ObjectId(team.id); });
      event.layerIds = event.layers.map(function(layer) { return layer.id; });
      Event.Model.findByIdAndUpdate(event._id, event, {upsert: true, new: false}, function(err, oldEvent) {
        if (err) return done(err);

        if (!oldEvent || !oldEvent.id) {
          log.info('calling create collection');
          createCollection('observations' + event._id, function(err) {
            if (err) return done(err);

            events.push(event);
            done();
          });
        } else {
          events.push(oldEvent);
          done();
        }
      });
    },
    function(err) {
      done(err);
    });
  });
}

function syncIcons(done) {
  log.info('sync icons');

  async.each(events, function(event, done) {
    var zipFile = path.join(os.tmpdir(), 'icons' + event._id.toString() + ".zip");
    var zipStream = fs.createWriteStream(zipFile);
    zipStream.on('finish', function() {
      log.info('got the zip file');
      new api.Form(event).import({path: zipFile, mimetype: 'application/zip'}, done);
    });

    var url = baseUrl + '/api/events/' + event._id + '/form.zip';
    log.info('url is', url);
    request.get(url).pipe(zipStream);
  }, function(err) {
    done(err);
  });
}

var featureLayers;
function syncLayers(done) {
  featureLayers = [];
  request.get(baseUrl + '/api/layers', function(err, res, layers) {
    if (err) return done(err);

    if (res.statusCode !== 200) return done(new Error('Error getting layers, respose code: ' + res.statusCode));

    log.info('syncing: ' + layers.length + ' layers');
    async.each(layers, function(layer, done) {
      layer._id = layer.id;
      delete layer.id;
      layer.collectionName = 'features' + layer._id;

      Layer.Model.findByIdAndUpdate(layer._id, layer, {upsert: true, new: false}, function(err, oldLayer) {
        if (err) return done(err);

        if (layer.type !== 'Feature') return done();

        if (!oldLayer || !oldLayer.id) {
          createCollection('features' + layer._id, function() {
            featureLayers.push(layer);
            done();
          });
        } else {
          featureLayers.push(oldLayer);
          done();
        }
      });
    },
    function(err) {
      done(err);
    });
  });
}

function syncFeatures(done) {
  log.info('syncing features for layers', featureLayers);

  async.each(featureLayers, function(layer, done) {
    request.get(baseUrl + '/api/layers/' + layer._id + '/features', function(err, res, featureCollection) {
      if (err) return done(err);

      if (res.statusCode !== 200) return done(new Error('Error getting features, respose code: ' + res.statusCode));

      log.info('syncing: ' + featureCollection.features.length + ' features');
      async.each(featureCollection.features, function(feature, done) {
        feature._id = feature.id;
        delete feature.id;
        Feature.featureModel(layer).findByIdAndUpdate(feature._id, feature, {upsert: true, new: true}, done);
      },
      function(err) {
        done(err);
      });
    });

  }, function(err) {
    done(err);
  });
}

function syncObservations(done) {
  fs.readJson(__dirname + "/.data.json", function(err, lastObservationTimes) {
    lastObservationTimes = lastObservationTimes || {};
    log.info('last', lastObservationTimes);

    async.each(events, function(event, done) {
      var url = baseUrl + '/api/events/' + event._id + "/observations";
      var lastTime = lastObservationTimes[event.collectionName];

      if (lastTime) {
        url += '?startDate=' + moment(lastTime).add('ms', 1).toISOString();
        lastTime = moment(lastTime);
      }
      log.info('observation url is', url);
      request.get(url, function(err, res, observations) {
        if (err) return done(err);

        if (res.statusCode !== 200) return done(new Error('Error getting observations, respose code: ' + res.statusCode));

        log.info('syncing: ' + observations.length + ' observations');
        async.each(observations, function(observation, done) {
          observation.properties = observation.properties || {};
          if (observation.lastModified) {
            var observationTime = moment(observation.lastModified);
            if (!lastTime || observationTime.isAfter(lastTime)) {
              lastTime = observationTime;
            }
          }

          if (observation.properties.timestamp) {
            observation.properties.timestamp = moment(observation.properties.timestamp).toDate();
          }

          var id = observation.id;
          delete observation.id;
          var state = observation.state;
          delete observation.state;
          if (observation.lastModified) observation.lastModified = moment(observation.lastModified).toDate();
          if (observation.attachments) {
            observation.attachments.forEach(function(attachment) {
              attachment._id = attachment.id;
              var id = mongoose.Types.ObjectId(attachment._id);
              attachment.id = id.getTimestamp().getTime();
              delete attachment.thumbnails;
            });
          }

          observation['$push'] = {states: state};

          Observation.observationModel(event).update({_id: id}, observation, {upsert: true}, done);
        },
        function(err) {
          lastObservationTimes[event.collectionName] = lastTime;
          done(err);
        });

      });
    },
    function(err) {
      if (err) return done(err);

      fs.writeJson(__dirname + "/.data.json", lastObservationTimes, done);
    });
  });
}

function requestLocations(event, lastLocation, done) {
  var url = baseUrl + '/api/events/' + event._id + '/locations?';

  var query = {limit: 2000};
  if (lastLocation) {
    query.startDate = moment(lastLocation.timestamp).toISOString();
    query.lastLocationId = lastLocation._id;
  }

  url = url + querystring.stringify(query);
  log.info('RAGE requesting locations, location url is', url);

  request.get(url, function(err, res, locations) {
    log.info('got locations from remote server', locations.length);

    if (err) return done(err);

    if (res.statusCode !== 200) return done(new Error('Error getting locations, respose code: ' + res.statusCode));

    return done(null, locations);
  });
}

function syncLocations(done) {
  fs.readJson(__dirname + "/.locations.json", function(err, lastLocationTimes) {
    lastLocationTimes = lastLocationTimes || {};

    async.each(events,function(event, done) {
      var lastLocation = lastLocationTimes[event.collectionName];
      lastLocation = lastLocation ? lastLocation.location : null;
      var lastTime = lastLocation ? moment(lastLocation.timestamp) : null;

      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, lastLocation, function(err, requestedLocations) {
          if (err) return done(err);
          locations = requestedLocations;

          syncUserLocations(event, locations, function(err) {
            if (err) return done(err);
            log.info('Successfully synced ' + locations.length + ' locations to mage');
            var last = locations.slice(-1).pop();
            if (last) {
              var locationTime = moment(last.properties.timestamp);
              if (!lastTime || (lastTime.isBefore(locationTime) && locationTime.isBefore(Date.now()))) {
                lastLocation = {_id: last._id, timestamp: last.properties.timestamp};
              }
            }

            lastLocationTimes[event.collectionName] = {
              location: lastLocation
            };
            fs.writeJson(__dirname + "/.locations.json", lastLocationTimes, done);
          });
        });
      },
      function() {
        return locations.length === 0;
      },
      function(err) {
        if (err) return done(err);

        lastLocationTimes.location = lastTime;
        done();
      });
    }, function(err) {
      done(err);
    });
  });
}

function syncUserLocations(event, locations, done) {
  log.info('got locations: ' + locations.length);
  locations.forEach(function(location) {
    location.properties = location.properties || {};
    if (location.properties.timestamp) {
      location.properties.timestamp = moment(location.properties.timestamp).toDate();
    }
  });

  async.parallel({
    locationCollection: function(done) {
      // throw all this users locations in the location collection
      async.each(locations, function(location, done) {
        Location.Model.findByIdAndUpdate(location._id, location, {upsert: true, new: true}, function(err) {
          if (err) log.error('error inserting location into locations collection', err);
          done();
        });
      },
      function(err) {
        done(err);
      });
    },
    cappedLocationCollection: function(done) {
      // Also need to update the user locations array
      // group all locations by user so I can do one insert per user
      var locationsByUserId = {};
      locations.forEach(function(location) {
        var user = locationsByUserId[location.userId];
        if (user) {
          user.locations.push(location);
        } else {
          locationsByUserId[location.userId] = { locations: [location] };
        }
      });

      async.each(Object.keys(locationsByUserId), function(userId, done) {
        CappedLocation.addLocations({_id: userId}, event, locationsByUserId[userId].locations, function(err) {
          done(err);
        });
      },
      function(err) {
        done(err);
      });
    }
  },
  function(err) {
    done(err);
  });
}
