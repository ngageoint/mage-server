module.exports = function(provision) {

  var log = require('winston')
    , UidStrategy = require('./strategies/uid').Strategy
    , Device = require('../models/device');

  log.info('setting up provision uid');

  provision.use(new UidStrategy(
    function(uid, done) {
      log.info('Authenticating device: ' + uid);
      Device.getDeviceByUid(uid, function(err, device) {
        if (err) {
          return done(err);
        }

        if (!device) {
          log.warn('Failed device provision attempt: Device uid ' + uid + ' does not exist');
          return done(null, false);
        }

        if (!device.registered) {
          log.warn('Failed device provision attempt: Device uid ' + uid + ' is not registered');
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
