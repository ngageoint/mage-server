module.exports = function(app, security) {
  const access = require('../access')
    , Setting = require('../models/setting')
    , passport = security.authentication.passport;

  app.all('/api/settings*', passport.authenticate('bearer'));

  app.get(
    '/api/settings',
    passport.authenticate('bearer'),
    access.authorize('READ_SETTINGS'),
    function (req, res, next) {
      Setting.getSettings()
        .then(settings => res.json(settings))
        .catch(err => next(err));
    }
  );

  app.get(
    '/api/settings/:type(banner|disclaimer)',
    function (req, res, next) {
      Setting.getSetting(req.params.type)
        .then(setting => res.json(setting))
        .catch(err => next(err));
    }
  );

  app.put(
    '/api/settings/:type(banner|disclaimer)',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_SETTINGS'),
    function(req, res, next) {
      Setting.updateSettingByType(req.params.type, {settings: req.body})
        .then(setting => res.json(setting))
        .catch(err => next(err));
    }
  );
};
