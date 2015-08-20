module.exports = function(app, security) {
  var access = require('../access')
    , Setting = require('../models/setting')
    , p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;


  app.all('/api/settings*', p***REMOVED***port.authenticate(authenticationStrategy));

  var validateRoleParams = function(req, res, next) {
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

  app.get(
    '/api/settings',
    access.authorize('READ_SETTINGS'),
    function (req, res, next) {
      Setting.getSettings(function(err, settings) {
        return res.json(settings);
      });
    }
  );

  app.get(
    '/api/settings/:type(banner|disclaimer)',
    access.authorize('READ_SETTINGS'),
    function (req, res, next) {
      Setting.getSettingByType(req.params.type, function(err, settingType) {
        return res.json(settingType);
      });
    }
  );

  app.put(
    '/api/settings/:type(banner|disclaimer)',
    access.authorize('UPDATE_SETTINGS'),
    function(req, res, next) {
      Setting.updateSettingByType(req.params.type, {settings: req.body}, function(err, setting) {
        if (err) return next(err);

        res.json(setting);
      });
    }
  );
}
