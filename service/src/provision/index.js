const Setting = require('../models/setting');
const { modulesPathsInDir } = require('../utilities/loader');
const log = require('../logger');
const AuthenticationConfiguration = require('../models/authenticationconfiguration');

/**
 * `Provision` constructor.
 *
 * @api public
 */
function Provision() {
  this.strategies = {};
}

Provision.prototype.use = function (name, strategy) {
  if (!strategy) {
    strategy = name;
    name = strategy.name;
  }
  if (!name) throw new Error('provisioning strategies must have a name');

  this.strategies[name] = strategy;
  return this;
};

Provision.prototype.check = function (type, name, options) {
  options = options || {};

  const strategies = this.strategies;

  return function (req, res, next) {
    AuthenticationConfiguration.getConfiguration(type, name).then(authConfig => {
      const localDeviceSettings = authConfig.settings.devicesReqAdmin || {};
      const strategy = localDeviceSettings.enabled !== false ? 'uid' : 'none';

      const provision = strategies[strategy];
      if (!provision) next(new Error('No registered provisioning strategy "' + strategy + '"'));

      provision.check(req, options, function (err, device, info = {}) {
        if (err) return next(err);

        req.provisionedDevice = device;

        if (!device || !device.registered) return res.status(403).send(info.message);

        next();
      });
    }).catch(err => {
      next(err);;
    });
  };
};

const provision = new Provision();

// Dynamically add all provisioning strategies
modulesPathsInDir(__dirname).forEach(modulePath => {
  const moduleName = modulePath.substring(0, modulePath.indexOf('.'));
  log.debug(`loading ${moduleName} provision strategy from ${modulePath}`);
  const initStrategy = require('./' + moduleName);
  initStrategy(provision);
});

/**
 * Expose `Provision`.
 */
module.exports = provision;
