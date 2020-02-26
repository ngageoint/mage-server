module.exports = function(provision) {

  var log = require('winston')
    , UidStrategy = require('./strategies/uid').Strategy
    , Device = require('../models/device');

  log.info('setting up provision uid');

  provision.use(new UidStrategy(
    function(req, uid, done) {
      log.info('Authenticating device: ' + uid);
      Device.getDeviceByUid(uid)
        .then(device => {
          if (!device) {
            //TODO should we verify user has permission to create a device?
            log.info("Device " + uid + " does not exist. Checking request parameters to see if device can be created.");
            var newDevice = {
                uid: req.param('uid'),
                name: req.param('name'),
                registered: false,
                description: req.param('description'),
                userAgent: req.headers['user-agent'],
                appVersion: req.param('appVersion'),
                userId: req.user.id
            };
            //TODO is this all we need to create a device?
            if(!newDevice.appVersion) {
              log.warn('Failed device provision attempt: Device uid ' + uid + ' cannot be created due to lacks of request parameters.');
              return done(null, false);
            }
            log.info("Device " + uid + " has required request parameters, so device creation will be attempted.");
            return Device.createDevice(newDevice).then(device => {
              if(!device) {
                log.warn("Failed to create device " + uid);
                return done(null, false);
              }
              else if (!device.registered) {
                log.warn('Successfully created device ' + uid + '. Device is not registered, so device provision attempt has failed.');
                return done(null, false);
              }
              done(null, device);
              })
            .catch(err => done(err));
          }
          else if (!device.registered) {
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
