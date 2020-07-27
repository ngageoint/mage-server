module.exports = function(app, security) {
  var async = require('async')
    , Role = require('../models/role')
    , User = require('../models/user')
    , Device = require('../models/device')
    , userTransformer = require('../transformers/user');

  var passwordLength = null;

  function loadPasswordSettings(req, res, next) {

    if (!passwordLength) {
      Setting.getSetting('security').then((securitySettings = {}) => {
        const settings = securitySettings.settings || {};
        passwordLength = Object.keys(security.authentication.strategies).reduce((prev, authName) => {
          let result = null;
          if (settings[authName]) {
            const passwordPolicy = settings[authName].passwordPolicy;
            if (passwordPolicy && passwordPolicy.passwordMinLengthEnabled) {
              result = passwordPolicy.passwordMinLength;
            }
          }
          return result || prev;
        }, null);
      }).finally(() => {
        next();
      });
    } else {
      next();
    }
  }

  function authorizeSetup(req, res, next) {
    User.count(function(err, count) {
      if (err) next(err);

      if (count > 0) {
        return res.sendStatus(404);
      }

      next();
    });
  }

  function validateSetup(req, res, next) {
    var username = req.param('username');
    if (!username) {
      return res.status(400).send('username is required');
    }

    var password = req.param('password');
    if (!password) {
      return res.status(400).send('password is required');
    }

    var passwordconfirm = req.param('passwordconfirm');
    if (!passwordconfirm) {
      return res.status(400).send('passwordconfirm is required');
    }

    if (password !== passwordconfirm) {
      return res.status(400).send('passwords do not match');
    }

    if (password.length < passwordLength) {
      return res.status(400).send('password does not meet minimum length requirment of ' + passwordLength + ' characters');
    }

    var uid = req.param('uid');
    if (!uid) {
      return res.send(400).send('passwordconfirm is required');
    }

    req.user = {
      username: username,
      displayName: username,
      active: true,
      authentication: {
        type: 'local',
        password: password
      }
    };

    req.device = {
      uid: uid,
      registered: true
    };

    next();
  }

  app.post(
    '/api/setup',
    loadPasswordSettings,
    authorizeSetup,
    validateSetup,
    function (req, res, next) {
      async.waterfall([
        function(done) {
          Role.getRole('ADMIN_ROLE', function(err, role) {
            done(err, role);
          });
        },
        function(role, done) {
          req.user.roleId = role._id;
          User.createUser(req.user, function(err, user) {
            done(err, user);
          });
        },
        function(user, done) {
          req.device.registered = true;
          req.device.userId = user._id;
          Device.createDevice(req.device)
            .then(device => done(null, user, device))
            .catch(err => done(err));
        }
      ], function(err, user, device) {
        if (err) return next(err);

        res.json({user: userTransformer.transform(user, {path: req.getRoot()}), device: device});
      });
    }
  );

};
