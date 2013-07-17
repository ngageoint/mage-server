module.exports = function(provision) {

  var UidStrategy = require('./strategies/uid').Strategy
    , Device = require('../models/device');

  provision.use(new UidStrategy(
    function(uid, done) {
      console.log('Authenticating device: ' + uid);
      Device.getDeviceByUid(uid, function(err, device) {
        if (err) {
          return done(err);
        }

        if (!device) {
          return done(null, false);
        }

        if (!device.registered) {
          return done(null, false);
        }

        return done(null, device);
      });
    }
  ));
}