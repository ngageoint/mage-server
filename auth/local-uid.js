module.exports = function(p***REMOVED***port) {

  var LocalUIDStrategy = require('../p***REMOVED***port-local-uid').Strategy
    , User = require('../models/user')
    , Device = require('../models/device');

  p***REMOVED***port.use(new LocalUIDStrategy(
    function(username, p***REMOVED***word, uid, done) {
      console.log('Authenticating device: ' + uid);
      User.getUserByUsername(username, function(err, user) {
        console.log('Authenticating user: ' + username);
        if (err) { return done(err); }

        if (!user) {
          return done(null, false, { message: "User with username '" + username + "' not found" });
        }

        user.validP***REMOVED***word(p***REMOVED***word, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (!isValid) {
            return ('Incorrect p***REMOVED***word');
          }

          Device.getDeviceById(uid, function(err, device) {
            if (err) {
              return done(err);
            }

            if (!device) {
              return done(null, false, { message: "Device with id '" + uid + "' not found" });
            }

            return done(null, user);

          });
        });
      });
    }
  ));

  return {
    strategy: 'local-uid',
    p***REMOVED***port: p***REMOVED***port
  };
}