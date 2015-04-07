var config = require('./config.json')
  , serverConfig = require('../../config.json')
  , querystring = require('querystring')
  , fs = require('fs-extra')
  , crypto = require('crypto')
  , async = require('async')
  , request = require('request')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , User = require('../../models/user')
  , Device = require('../../models/device')
  , Event = require('../../models/event')
  , Observation = require('../../models/observation')
  , Location = require('../../models/location')
  , CappedLocation = require('../models/cappedLocation');

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

// TODO test
var syncTeams = function(done) {
  var options = {
    url: baseUrl + '/api/teams',
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, teams) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting teams, respose code: ' + res.statusCode));

    console.log('syncing: ' + teams.length + ' teams');
    async.each(teams,
      function(team, done) {
        var id = team._id;
        delete team._id;
        Team.TeamModel.findByIdAndUpdate(id, team, {upsert: true}, done);
      },
      function(err) {
        done(err);
      }
    );
  });
}

var createObservationCollection = function(event, done) {
  console.log("Creating observation collection: " + event.collectionName + ' for event ' + event.name);
  mongoose.connection.db.createCollection(event.collectionName, function(err, collection) {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Successfully created observation collection for event " + event.name);
    done();
  });
}

var events; // TODO need to pull down the form and import it
var syncEvents = function(done) {
  var options = {
    url: baseUrl + '/api/events',
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, allEvents) {
    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting events, respose code: ' + res.statusCode));

    console.log('syncing: ' + allEvents.length + ' events');
    async.each(allEvents,
      function(event, done) {
        var update =  {id: event.id, name: event.name, collectionName: 'observations' + event.id};

        Event.Model.findOneAndUpdate({id: event._id}, update, {upsert: true, new: false}, function(err, oldEvent) {
          if (!oldEvent || !oldEvent.id) {
            createObservationCollection(event, function() {
              events.push(event);
              done(err);
            });
          } else {
            events.push(event);
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

var syncObservations = function(done) {
  console.log('syncing observations for events', events);

  fs.readJson(__dirname + "/.data.json", function(err, lastObservationTimes) {
    lastObservationTimes = lastObservationTimes || {};
    console.log('last', lastObservationTimes);

    async.each(events,function(event, done) {
      var url = baseUrl + '/api/events/' + event.id + "/observations";
      var lastTime = lastObservationTimes[event.collectionName];

      if (lastTime) {
        url += '?startDate=' + moment(lastTime).add('ms', 1).toISOString();
        lastTime = moment(lastTime);
      }
      console.log('observation url is', url);
      var options = {
        url: url,
        json: true,
        headers: headers
      };

      request.get(options, function(err, res, observations) {
        if (err) return done(err);

        if (res.statusCode != 200) return done(new Error('Error getting observations, respose code: ' + res.statusCode));

        console.log('syncing: ' + observations.length + ' observations');
        async.each(observations,
          function(observation, done) {
            observation.properties = observation.properties || {};
            if (observation.lastModified) {
              var observationTime = moment(observation.lastModified);
              if (!lastTime || observationTime.isAfter(lastTime)) {
                lastTime = observationTime;
              }
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
        fs.writeJson(__dirname + "/.data.json", lastObservationTimes, done);
      }
    );
  });
}

function requestLocations(event, lastLocation, done) {
  var url = baseUrl + '/api/events/' + event._id + 'locations?';

  var query = {limit: 2000};
  if (lastLocation) {
    query.startDate = moment(lastLocation.timestamp).toISOString();
    query.lastLocationId = lastLocation._id;
  }

  url = url + querystring.stringify(query);
  console.log('RAGE requesting locations, location url is', url);

  var options = {
    url: url,
    json: true,
    headers: headers
  };

  request.get(options, function(err, res, locations) {
    console.log('got locations from remote server', locations.length);

    if (err) return done(err);

    if (res.statusCode != 200) return done(new Error('Error getting locations, respose code: ' + res.statusCode));

    return done(null, locations);
  });
}

function syncLocations(done) {
  fs.readJson(__dirname + "/.locations.json", function(err, lastLocationTimes) {
    lastLocationTimes = lastLocationTimes || {};

    var lastLocation = lastLocationTimes[event.collectionName];
    lastLocation = lastLocation ? lastLocation.location : null;
    var lastTime = lastLocation ? moment(lastLocation.timestamp) : null;

    async.each(events,function(event, done) {
      var locations = [];
      async.doUntil(function(done) {
        requestLocations(event, lastLocation, function(err, requestedLocations) {
          if (err) return done(err);
          locations = requestedLocations;

          syncUserLocations(event, locations, function(err) {
            if (err) return done(err);
            console.log('Successfully synced ' + locations.length + ' locations to mage');
            var last = locations.slice(-1).pop();
            if (last) {
              var locationTime = moment(last.properties.timestamp);
              if (!lastTime || (lastTime.isBefore(locationTime) && locationTime.isBefore(Date.now()))) {
                lastLocation = {_id: last._id, timestamp: last.properties.timestamp};
              }
            }

            lastLocationTimes.location = lastLocation;
            fs.writeJson(__dirname + "/.locations.json", lastLocationTimes, done);
          });
        });
      },
      function() {
        return locations.length == 0;
      },
      function(err) {
        if (err) return done(err);

        lastLocationTimes.location = lastTime;
      });
    }, function(err) {
      done(err);
    });
  });
}

function syncUserLocations(event, locations, done) {
  console.log('got locations: ' + locations.length);

  async.parallel({
    locationCollection: function(done) {
      // throw all this users locations in the location collection
      async.each(locations, function(location, done) {
        // var locationId = location._id;
        // delete location._id;
        Location.Model.findByIdAndUpdate(location._id, location, {upsert: true}, function(err, location) {
          if (err) console.log('error inserting location into locations collection', err);
          done();
        });
      },
      function(err) {
        done();
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
