const log = require('winston')
  , Device = require('../models/device');

module.exports = function(provision) {

  const NoneStrategy = require('./strategies/none').Strategy;

  provision.use(new NoneStrategy(function (req, uid, done) {
    log.info(`Provision device ${uid} with NoneStrategy`);

    if (!uid) {
      return done(null, { registered: true });
    }

    Device.getDeviceByUid(uid).then(device => {
      if (!device) {
        const newDevice = {
          uid: req.param('uid'),
          name: req.param('name'),
          registered: true,
          description: req.param('description'),
          userAgent: req.headers['user-agent'],
          appVersion: req.param('appVersion'),
          userId: req.user.id
        };

        Device.createDevice(newDevice).then(device => {
          if (!device) {
            log.warn("Failed to create device " + uid);
            return done(null, false);
          }

          done(null, device);
        }).catch(err => done(err));
      } else if (!device.registered) {
        device.registered = true;
        Device.updateDevice(device._id, device).then(updatedDevice => {
          done(null, updatedDevice);
        });
      } else {
        done(null, device);
      }
    }).catch(err => done(err));
  }));
};
