module.exports = function(p***REMOVED***port) {

  var LocalUIDStrategy = require('../p***REMOVED***port-local-uid').Strategy
    , User = require('../models/user')
    , Device = require('../models/device');

  p***REMOVED***port.use(new LocalUIDStrategy(
    function(username, p***REMOVED***word, uid, done) {
      console.log('Authenticating user: ' + username + ' for device: ' + uid);
      User.getUserByUsername(username, function(err, user) {
        if (err) { return done(err); }

        if (!user) {
          return done(null, false, { message: "User with username '" + username + "' not found" });
        }

        user.validP***REMOVED***word(p***REMOVED***word, function(err, isValid) {
          console.log('valid p***REMOVED***word is: ' + isValid);
          if (err) {
            return done(err);
          }

          if (!isValid) {
            return done(null, false, { message: "Invalid p***REMOVED***word"});
          }

          Device.getDeviceByUid(uid, function(err, device) {
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