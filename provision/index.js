const fs = require('fs');
const Setting = require('../models/setting');

/**
 * `Provision` constructor.
 *
 * @api public
 */
function Provision() {
  this.strategies = {};
}

Provision.prototype.use = function(name, strategy) {
  if (!strategy) {
    strategy = name;
    name = strategy.name;
  }
  if (!name) throw new Error('provisioning strategies must have a name');

  this.strategies[name] = strategy;
  return this;
};

Provision.prototype.check = function(type, options) {
  options = options || {};

  const strategies = this.strategies;

  return function(req, res, next) {
    Setting.getSetting('security').then(({settings}) => {
      const localAuthentication = settings[type] || {};
      const localDeviceSettings = localAuthentication.devicesReqAdmin || {};
      const strategy = localDeviceSettings.enabled !== false ? 'uid' : 'none';

      const provision = strategies[strategy];
      if (!provision) next(new Error('No registered provisioning strategy "' + strategy + '"'));

      provision.check(req, options, function (err, device, info = {}) {
        if (err) return next(err);

        req.provisionedDevice = device;

        if (!device || !device.registered) return res.status(403).send(info.message);

        next();
      });
    })
  };
};

const provision = new Provision();

// Dynamically add all provisioning strategies
fs.readdirSync(__dirname).forEach(function (file) {
  if (file[0] === '.' || file === 'index.js' || file.indexOf('.js') === -1) return;
  const strategy = file.substr(0, file.indexOf('.'));
  require('./' + strategy)(provision);
});

/**
 * Expose `Provision`.
 */
module.exports = provision;
