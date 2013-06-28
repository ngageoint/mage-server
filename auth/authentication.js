module.exports = function(strategy) {

  var p***REMOVED***port = require('p***REMOVED***port'), 
      BearerStrategy = require('p***REMOVED***port-http-bearer').Strategy
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

  p***REMOVED***port.use(new BearerStrategy(
    function(token, done) {
      Token.getUserForToken(token, function(err, user) {
        if (err) { return done(err); }

        if (!user) { return done(null, false); }

        return done(null, user, { scope: 'all' });
      });
    }
  ));

  var authentication = require('./' + strategy)(p***REMOVED***port);

  return authentication;
}