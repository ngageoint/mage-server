module.exports = function(app, security) {
  var access = require('../access')
    , Setting = require('../models/setting')
    , passport = security.authentication.passport;

  app.all('/api/settings*', passport.authenticate('bearer'));

  app.get(
    '/api/settings',
    passport.authenticate('bearer'),
    access.authorize('READ_SETTINGS'),
    function (req, res, next) {
      Setting.getSettings(function(err, settings) {
        if (err) return next(err);

        return res.json(settings);
      });
    }
  );

  app.get(
    '/api/settings/:type(banner|disclaimer)',
    function (req, res, next) {
      Setting.getSettingByType(req.params.type, function(err, settingType) {
        if (err) return next(err);

        return res.json(settingType);
      });
    }
  );

  app.put(
    '/api/settings/:type(banner|disclaimer)',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_SETTINGS'),
    function(req, res, next) {
      Setting.updateSettingByType(req.params.type, {settings: req.body}, function(err, setting) {
        if (err) return next(err);

        res.json(setting);
      });
    }
  );
};
