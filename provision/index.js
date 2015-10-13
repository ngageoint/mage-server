/**
 * `Provision` constructor.
 *
 * @api public
 */
function Provision(strategy) {
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

Provision.prototype.check = function(strategy, options) {
  options = options || {};
  var provision = this.strategies[strategy];

  return function(req, res, next) {
    if (!provision) next(new Error("No registered provisioning strategy '" + strategy + "'"));

    provision.check(req, options, function(err, device) {
      if (err) return next(err);

      if (!device) return res.send(401);

      req.provisionedDevice = device;
      next();
    });
  }
}

/**
 * Expose `Provision`.
 */
module.exports = new Provision();
