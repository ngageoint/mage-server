/**
 * Module dependencies.
 */
//var util = require('util');

/**
 * `Access` constructor.
 *
 * @api public
 */
function Access() {
}

Access.prototype.hasRoles = function(roles) {
  return function(req, res, next) {
    console.log('verifying access for roles: ' + JSON.stringify(roles));
    var userRoles = req.user.roles;

    roles.forEach(function(role) {
      if (userRoles.indexOf(role) == -1) {
        res.send(401);
      }
    });

    next();
  }
}

/**
 * Expose `Access`.
 */ 
module.exports = new Access();