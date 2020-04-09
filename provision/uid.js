module.exports = function(provision) {

  const log = require('winston')
    , UidStrategy = require('./strategies/uid').Strategy
    , Device = require('../models/device');

  log.info('setting up provision uid');

  provision.use(new UidStrategy(function(req, uid, done) {
    log.info(`Provision device ${uid} with UidStrategy`);

    Device.getDeviceByUid(uid).then(device => {
      if (!device) {
        log.info("Device " + uid + " does not exist. Checking request parameters to see if device can be created.");
        const newDevice = {
          uid: req.param('uid'),
          name: req.param('name'),
          registered: false,
          description: req.param('description'),
          userAgent: req.headers['user-agent'],
          appVersion: req.param('appVersion'),
          userId: req.user.id
        };

        return Device.createDevice(newDevice).then(device => {
          if (!device) {
            log.warn('Failed to create device ' + uid);
            return done(null, false);
          } else if (!device.registered) {
            log.warn('Successfully created device ' + uid + '. Device is not registered, device provision attempt has failed.');
            return done(null, false);
          }
          done(null, device);
        }).catch(err => done(err));
      } else if (!device.registered) {
        log.warn('Failed device provision attempt: Device uid ' + uid + ' is not registered');
        return done(null, false);
      }

      done(null, device);
    }).catch(err => done(err));
  }));
};
