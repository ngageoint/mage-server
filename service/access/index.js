/**
 * Module dependencies.
 */

/**
 * `Access` constructor.
 *
 * @api public
 */
function Access() {
}

Access.prototype.authorize = function(permission) {
  return function(req, res, next) {
    if (!req.user) return next();

    var role = req.user.roleId;
    if (!role) {
      return res.sendStatus(403);
    }

    var userPermissions = role.permissions;

    var ok = userPermissions.indexOf(permission) !== -1;

    if (!ok) return res.sendStatus(403);

    next();
  };
};

Access.prototype.userHasPermission = function(user, permission) {
  if (!user || !user.roleId) return false;

  return user.roleId.permissions.indexOf(permission) !== -1;
};

/**
 * Expose `Access`.
 */
module.exports = new Access();
