module.exports = function(app, security) {
  const access = require('../access')
    , Setting = require('../models/setting')
    , log = require('../logger').child({ component: 'settings' })
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
    '/api/settings/:type(banner|disclaimer|contactinfo)',
    function (req, res, next) {
      Setting.getSetting(req.params.type)
        .then(setting => res.json(setting))
        .catch(err => next(err));
    }
  );

  app.put(
    '/api/settings/:type(banner|disclaimer|contactinfo)',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_SETTINGS'),
    function(req, res, next) {
      Setting.getSetting(req.params.type)
        .then(existing => {
          const previousHeaderText = (existing && existing.settings && existing.settings.headerText) || '';
          const newHeaderText = req.body.headerText || '';
          const previousShowHeader = !!(existing && existing.settings && existing.settings.showHeader);
          const newShowHeader = !!req.body.showHeader;
          return Setting.updateSettingByType(req.params.type, {settings: req.body}).then(setting => {
            if (req.params.type === 'banner' && newShowHeader !== previousShowHeader) {
              log.info('banner header visibility changed', {
                showHeader: newShowHeader,
                headerText: newHeaderText,
                changedBy: req.user.username,
                changedTime: new Date().toISOString()
              });
            }
            if (req.params.type === 'banner' && newHeaderText !== previousHeaderText) {
              log.info('banner header text changed', {
                headerText: newHeaderText,
                previousHeaderText: previousHeaderText,
                changedBy: req.user.username,
                changedTime: new Date().toISOString()
              });
            }
            res.json(setting);
          });
        })
        .catch(err => next(err));
    }
  );
};
