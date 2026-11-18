module.exports = function(app, security) {
  const access = require('../access')
    , Setting = require('../models/setting')
    , log = require('../logger').child({ component: 'settings' });

  app.all('/api/settings*', security.authentication.bearerAuthentication);

  app.get(
    '/api/settings',
    security.authentication.bearerAuthentication,
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
    security.authentication.bearerAuthentication,
    access.authorize('UPDATE_SETTINGS'),
    function(req, res, next) {
      Setting.getSetting(req.params.type)
        .then(existing => {
          const previousHeaderText = (existing && existing.settings && existing.settings.headerText) || '';
          const newHeaderText = req.body.headerText || '';
          const previousShowHeader = !!(existing && existing.settings && existing.settings.showHeader);
          const newShowHeader = !!req.body.showHeader;
          const previousShowDisclaimer = !!(existing && existing.settings && existing.settings.show);
          const newShowDisclaimer = !!req.body.show;
          const previousDisclaimerText = (existing && existing.settings && existing.settings.text) || '';
          const newDisclaimerText = req.body.text || '';
          const previousContactInfo = (existing && existing.settings) || {};
          const newContactInfo = req.body || {};
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
            if (req.params.type === 'disclaimer' && newShowDisclaimer !== previousShowDisclaimer) {
              log.info(newShowDisclaimer ? 'disclaimer message added' : 'disclaimer message removed', {
                text: newDisclaimerText,
                changedBy: req.user.username,
                changedTime: new Date().toISOString()
              });
            }
            if (req.params.type === 'disclaimer' && newDisclaimerText !== previousDisclaimerText) {
              log.info('disclaimer message text changed', {
                text: newDisclaimerText,
                previousText: previousDisclaimerText,
                changedBy: req.user.username,
                changedTime: new Date().toISOString()
              });
            }
            if (req.params.type === 'contactinfo') {
              log.info('contact info settings changed', {
                previousContactInfo: previousContactInfo,
                contactInfo: newContactInfo,
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
