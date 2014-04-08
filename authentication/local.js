module.exports = function(p***REMOVED***port) {

  var LocalStrategy = require('p***REMOVED***port-local').Strategy
    , BearerStrategy = require('p***REMOVED***port-http-bearer').Strategy
    , Token = require('../models/token')
    , User = require('../models/user');

  p***REMOVED***port.use(new BearerStrategy(
    {p***REMOVED***ReqToCallback: true},
    function(req, token, done) {
      Token.getToken(token, function(err, retrievedToken) {
        if (err) { return done(err); }

        if (!retrievedToken || !retrievedToken.user) { return done(null, false); }

        // add the provisionedDevice to the request if available
        if (retrievedToken.deviceId) {
          req.provisionedDeviceId = retrievedToken.deviceId;
        }

        return done(null, retrievedToken.user, { scope: 'all' });
      });
    }
  ));

  p***REMOVED***port.use(new LocalStrategy(
    function(username, p***REMOVED***word, done) {
      console.log('Authenticating user: ' + username);
      User.getUserByUsername(username, function(err, user) {
        if (err) { return done(err); }

        if (!user) {
          console.log('Failed login attempt: User with username ' + username + ' not found');
          return done(null, false, { message: "User with username '" + username + "' not found" });
        }

        if (!user.active) {
          console.log('Failed user login attempt: User ' + user.username + ' is not active');
          return done(null, false, { message: "User with username '" + username + "' not active" });
        }

        user.validP***REMOVED***word(p***REMOVED***word, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (!isValid) {
            console.log('Failed login attempt: User with username ' + username + ' provided an invalid p***REMOVED***word');
            return done(null, false);
          }

          return done(null, user);
        });
      });
    }
  ));

  return {
    p***REMOVED***port: p***REMOVED***port,
    loginStrategy: 'local',
    authenticationStrategy: 'bearer'
  }
}