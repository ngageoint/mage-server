module.exports = function(strategy) {

  var p***REMOVED***port = require('p***REMOVED***port')
    , User = require('../models/user')
    , Token = require('../models/token');

  p***REMOVED***port.serializeUser(function(user, done) {
    done(null, user._id);
  });

  p***REMOVED***port.deserializeUser(function(id, done) {
    User.getUserById(id, function(err, user) {
      done(err, user);
    });
  });

  // setup p***REMOVED***port authentication
  var authentication = require('./' + strategy)(p***REMOVED***port);

  return authentication;
}