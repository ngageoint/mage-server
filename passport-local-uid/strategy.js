/**
 * Module dependencies.
 */
var p***REMOVED***port = require('p***REMOVED***port')
  , util = require('util');

/**
 * `Strategy` constructor.
 *
 * The uid (unique id) authentication strategy authenticates requests based on the
 * credentials submitted through an HTML-based login form.
 *
 * Applications must supply a `verify` callback which accepts `uid`
 * credentials, and then calls the `done` callback supplying a
 * `user`, which should be set to `false` if the credentials are not valid.
 * If an exception occured, `err` should be set.
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *   - `uidField`  field name where the username is found, defaults to _username_
 *   - `p***REMOVED***ReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *
 * Examples:
 *
 *     p***REMOVED***port.use(new UIDStrategy(
 *       function(uid, done) {
 *         User.findOne({ uid: uid }, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  if (typeof options == 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('uid authentication strategy requires a verify function');
  
  this._usernameField = options.usernameField || 'username';
  this._p***REMOVED***wordField = options.p***REMOVED***wordField || 'p***REMOVED***word';
  this._uidField = options.uidField || 'uid';
  
  p***REMOVED***port.Strategy.call(this);
  this.name = 'local-uid';
  this._verify = verify;
  this._p***REMOVED***ReqToCallback = options.p***REMOVED***ReqToCallback;
}

/**
 * Inherit from `p***REMOVED***port.Strategy`.
 */
util.inherits(Strategy, p***REMOVED***port.Strategy);

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
  options = options || {};
  var username = lookup(req.body, this._usernameField) || lookup(req.query, this._usernameField);
  var p***REMOVED***word = lookup(req.body, this._p***REMOVED***wordField) || lookup(req.query, this._p***REMOVED***wordField);
  var uid = lookup(req.body, this._uidField) || lookup(req.query, this._uidField);
  
  if (!username || !p***REMOVED***word || !uid) {
    return this.fail(new Error(options.badRequestMessage || 'Missing credentials'));
  }
  
  var self = this;
  
  function verified(err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(info); }
    self.success(user, info);
  }
  
  if (self._p***REMOVED***ReqToCallback) {
    this._verify(req, username, p***REMOVED***word, uid, verified);
  } else {
    this._verify(username, p***REMOVED***word, uid, verified);
  }
  
  function lookup(obj, field) {
    if (!obj) { return null; }
    var chain = field.split(']').join('').split('[');
    for (var i = 0, len = chain.length; i < len; i++) {
      var prop = obj[chain[i]];
      if (typeof(prop) === 'undefined') { return null; }
      if (typeof(prop) !== 'object') { return prop; }
      obj = prop;
    }
    return null;
  }
}


/**
 * Expose `Strategy`.
 */ 
module.exports = Strategy;