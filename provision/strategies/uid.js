function Strategy(options, verify) {
  if (typeof options == 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('uid provisioning strategy requires a verify function');
  
  this.uidField = options.usernameField || 'uid';
  
  this.name = 'uid';
  this.verify = verify;
}

Strategy.prototype.check = function(req, options, done) {
  if (typeof options == 'function') {
    done = options;
    options = {};
  }

  var uid = req.param(this.uidField);
  
  if (!uid) {
    return this.fail(new BadRequestError(options.badRequestMessage || 'Missing uid'));
  }
  
  this.verify(uid, done);
}

/**
 * Expose `Strategy`.
 */ 
 exports.Strategy = Strategy;