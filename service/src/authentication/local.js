const log = require('../logger').child({ component: 'authentication' })
  , moment = require('moment')
  , LocalStrategy = require('passport-local').Strategy
  , TokenAssertion = require('./verification').TokenAssertion
  , User = require('../models/user')
  , userTransformer = require('../transformers/user')
  , { app, passport, tokenService } = require('./index')
  , Authentication = require('../models/authentication');

function configure() {
  log.info('Configuring local authentication');
  passport.use(new LocalStrategy(
    { passReqToCallback: true },
    function (req, username, password, done) {
      User.getUserByUsername(username, function (err, user) {
        if (err) { return done(err); }

        function failedLogin(reason, message, meta) {
          log.warn('failed login attempt', Object.assign({
            username: username,
            reason: reason,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            attemptTime: new Date().toISOString()
          }, meta));
          return done(null, false, { message: message });
        }

        if (!user) {
          return failedLogin('user not found', 'Please check your username and password and try again.');
        }

        if (!user.active) {
          return failedLogin('account not active', 'User account is not approved, please contact your MAGE administrator to approve your account.');
        }

        if (!user.enabled) {
          return failedLogin('account disabled', 'Your account has been disabled, please contact a MAGE administrator for assistance.');
        }

        const settings = user.authentication.security;
        if (settings && settings.locked && moment().isBefore(moment(settings.lockedUntil))) {
          return failedLogin('account locked', 'Your account has been temporarily locked, please try again later or contact a MAGE administrator for assistance.', {
            lockedUntil: moment(settings.lockedUntil).toISOString()
          });
        }

        if (!(user.authentication instanceof Authentication.Local)) {
          return failedLogin('not a local account', 'You do not have a local account, please contact a MAGE administrator for assistance.');
        }

        if (!user.authentication.authenticationConfiguration.enabled) {
          return failedLogin('authentication method disabled', 'Authentication method is not enabled, please contact a MAGE administrator for assistance.', {
            authenticationMethod: user.authentication.authenticationConfiguration.title
          });
        }

        user.authentication.validatePassword(password, function (err, isValid) {
          if (err) return done(err);

          if (isValid) {
            User.validLogin(user)
              .then(() => done(null, user))
              .catch(err => done(err));
          } else {
            User.invalidLogin(user)
              .then(() => failedLogin('invalid password', 'Please check your username and password and try again.'))
              .catch(err => done(err));
          }
        });
      });
    }
  ));
}

function initialize() {
  configure();

  app.post('/auth/local/signin',
    function authenticate(req, res, next) {
      passport.authenticate('local', function (err, user, info = {}) {
        if (err) return next(err);

        if (!user) return res.status(401).send(info.message);
        req.user = user;

        tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
          .then(token => {
            res.json({
              token: token,
              user: userTransformer.transform(user, { path: req.getRoot() })
            });
          }).catch(err => {
            next(err);
          });
      })(req, res, next);
    }
  );
};

module.exports = {
  initialize
}