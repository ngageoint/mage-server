/**
 * Module dependencies.
 */
var Role = require('../models/role');

/**
 * `Access` constructor.
 *
 * @api public
 */
function Access(authentication) {
}

Access.prototype.authorize = function(permission) {
  return function(req, res, next) {
    if (!req.user) return next();

    var role = req.user.roleId;
    if (!role) {
      return res.sendStatus(403);
    }

    var userPermissions = role.permissions;

    var ok = userPermissions.indexOf(permission) != -1;

    if (!ok) return res.sendStatus(403);

    next();
  }
}

Access.prototype.hasPermission = function(user, permission, done) {
  if (!user) return done(null, false);

  var role = user.roleId;
  if (!role) return done(null, false);

  var userPermissions = role.permissions;

  var hasPermission = userPermissions.indexOf(permission) != -1;

  done(null, hasPermission);
}

/**
 * Expose `Access`.
 */
module.exports = new Access();
