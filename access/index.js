/**
 * Module dependencies.
 */
var Role = require('../models/role');

/**
 * `Access` constructor.
 *
 * @api public
 */
function Access() {
}

Access.prototype.hasPermission = function(permission) {
  return function(req, res, next) {
    var role = req.user.role;
    if (!role) {
      return res.send(401);
    }

    var userPermissions = req.user.role.permissions;

    var ok = userPermissions.indexOf(permission) != -1;

    if (!ok) return res.send(401);

    next();
  }
}

Access.prototype.hasPermissions = function(permissions) {
  return function(req, res, next) {

    var role = req.user.role;
    if (!role) {
      return res.send(401);
    }

    var userPermissions = req.user.role.permissions;

    var ok = permissions.every(function(permission) {
      return userPermissions.indexOf(permission) != -1;
    });

    if (!ok) return res.send(401);

    next();
  }
}

/**
 * Expose `Access`.
 */ 
module.exports = new Access();