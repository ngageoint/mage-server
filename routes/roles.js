module.exports = function(app, security) {
  var access = require('../access')
    , Role = require('../models/role')
    , passport = security.authentication.passport;

  app.all('/api/roles*', passport.authenticate('bearer'));

  function validateRoleParams(req, res, next) {
    var name = req.param('name');
    if (!name) {
      return res.send(400, "cannot create role 'name' param not specified");
    }

    var description = req.param('description');
    var permissions = req.param('permissions');
    if (permissions) {
      permissions = permissions.split(',');
    }

    req.roleParam = {name: name, description: description, permissions: permissions};
    next();
  }

  // get all roles
  app.get(
    '/api/roles',
    access.authorize('READ_ROLE'),
    function (req, res) {
      Role.getRoles(function(err, roles) {
        return res.json(roles);
      });
    }
  );

  // get role
  app.get(
    '/api/roles/:roleId',
    access.authorize('READ_ROLE'),
    function (req, res) {
      res.json(req.role);
    }
  );

  // Create a new role
  app.post(
    '/api/roles',
    access.authorize('CREATE_ROLE'),
    validateRoleParams,
    function(req, res) {
      Role.createRole(req.roleParam, function(err, role) {
        if (err) {
          return res.send(400, err);
        }

        res.json(role);
      });
    }
  );

  // Update a role
  app.put(
    '/api/roles/:roleId',
    access.authorize('UPDATE_ROLE'),
    function(req, res) {
      var update = {};
      if (req.roleParam.name) update.name = req.roleParam.name;
      if (req.roleParam.description) update.description = req.roleParam.description;
      if (req.roleParam.permissions) {
        update.permissions = req.roleParam.permissions.split(',');
      }

      Role.updateRole(req.role._id, update, function(err, role) {
        if (err) {
          return res.send(400, err);
        }

        res.json(role);
      });
    }
  );

  // Delete a role
  app.delete(
    '/api/roles/:roleId',
    access.authorize('DELETE_ROLE'),
    function(req, res) {
      Role.deleteRole(req.role, function(err, role) {
        if (err) {
          return res.send(400, err);
        }

        res.json(role);
      });
    }
  );
};
