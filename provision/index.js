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

Provision.prototype.check = function(type, options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  const strategies = this.strategies;

  return async function(req, res, next) {
    let strategy;
    try {
      const security = await Setting.getSetting('security') || { settings: {} };
      const localAuthentication = security.settings[type] || {}; // TODO cannot just use local here right?
      const localDeviceSettings = localAuthentication.devicesReqAdmin || {};
      strategy = localDeviceSettings.enabled !== false ? 'uid' : 'none';
    } catch (err) {
      return next(err);
    }

    const provision = strategies[strategy];
    if (!provision) next(new Error('No registered provisioning strategy "' + strategy + '"'));

    provision.check(req, options, function(err, device) {
      if (err) return next(err);

      req.provisionedDevice = device;

      if (callback) return callback(null, device);

      if (!device || !device.registered) return res.sendStatus(403);

      next();
    });
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
