module.exports = function(provision) {

  var UidStrategy = require('./strategies/uid').Strategy
    , Device = require('../models/device');

    console.log('setting up provision uid');

  provision.use(new UidStrategy(
    function(uid, done) {
      console.log('Authenticating device: ' + uid);
      Device.getDeviceByUid(uid, function(err, device) {
        if (err) {
          return done(err);
        }

        if (!device) {
          console.log('Failed device provision attempt: Device uid ' + uid + ' does not exist');
          return done(null, false);
        }

        if (!device.registered) {
          console.log('Failed device provision attempt: Device uid ' + uid + ' is not registered');
          return done(null, false);
        }

        return done(null, device);
      });
    }
  ));

  return {
    provision: provision,
    strategy: 'uid'
  }
}