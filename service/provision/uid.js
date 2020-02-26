module.exports = function(provision) {

  var log = require('winston')
    , UidStrategy = require('./strategies/uid').Strategy
    , Device = require('../models/device');

  log.info('setting up provision uid');

  provision.use(new UidStrategy(
    function(uid, done) {
      log.info('Authenticating device: ' + uid);
      Device.getDeviceByUid(uid)
        .then(device => {
          if (!device) {
            log.warn('Failed device provision attempt: Device uid ' + uid + ' does not exist');
            return done(null, false);
          }

          if (!device.registered) {
            log.warn('Failed device provision attempt: Device uid ' + uid + ' is not registered');
            return done(null, false);
          }

          done(null, device);
        })
        .catch(err => done(err));
    }
  ));

  return {
    provision: provision,
    strategy: 'uid'
  };
};
