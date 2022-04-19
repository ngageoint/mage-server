const log = require('winston')
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
    function (username, password, done) {
      User.getUserByUsername(username, function (err, user) {
        if (err) { return done(err); }

        if (!user) {
          log.warn('Failed login attempt: User with username ' + username + ' not found');
          return done(null, false, { message: 'Please check your username and password and try again.' });
        }

        if (!user.active) {
          log.warn('Failed user login attempt: User ' + user.username + ' is not active');
          return done(null, false, { message: 'User account is not approved, please contact your MAGE administrator to approve your account.' });
        }

        if (!user.enabled) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is disabled.');
          return done(null, false, { message: 'Your account has been disabled, please contact a MAGE administrator for assistance.' });
        }

        const settings = user.authentication.security;
        if (settings && settings.locked && moment().isBefore(moment(settings.lockedUntil))) {
          log.warn('Failed user login attempt: User ' + user.username + ' account is locked until ' + settings.lockedUntil);
          return done(null, false, { message: 'Your account has been temporarily locked, please try again later or contact a MAGE administrator for assistance.' });
        }

        if (!(user.authentication instanceof Authentication.Local)) {
          log.warn(user.username + " is not a local account");
          return done(null, false, { message: 'You do not have a local account, please contact a MAGE administrator for assistance.' });
        }

        if (!user.authentication.authenticationConfiguration.enabled) {
          log.warn(user.authentication.authenticationConfiguration.title + " authentication is not enabled");
          return done(null, false, { message: 'Authentication method is not enabled, please contact a MAGE administrator for assistance.' });
        }

        user.authentication.validatePassword(password, function (err, isValid) {
          if (err) return done(err);

          if (isValid) {
            User.validLogin(user)
              .then(() => done(null, user))
              .catch(err => done(err));
          } else {
            log.warn('Failed login attempt: User with username ' + username + ' provided an invalid password');
            User.invalidLogin(user)
              .then(() => done(null, false, { message: 'Please check your username and password and try again.' }))
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