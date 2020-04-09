function Strategy(options, verify) {
  if (typeof options === 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('uid provisioning strategy requires a verify function');

  this.uidField = options.uidField || 'uid';

  this.name = 'uid';
  this.verify = verify;
}

Strategy.prototype.check = function(req, options, done) {
  if (typeof options === 'function') {
    done = options;
    options = {};
  }

  const uid = options.uid || req.param(this.uidField);
  if (!uid) {
    return done(new Error(options.badRequestMessage || 'Missing uid'));
  }

  this.verify(req, uid, done);
};

/**
 * Expose `Strategy`.
 */
exports.Strategy = Strategy;
