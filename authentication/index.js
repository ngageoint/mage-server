const crypto = require('crypto')
  , verification = require('./verification')
  , api = require('../api/')
  , config = require('../config.js')
  , userTransformer = require('../transformers/user');
  
const JWTService = verification.JWTService;
const TokenAssertion = verification.TokenAssertion;

module.exports = function(app, passport, provision, strategies) {
  const tokenService = new JWTService(crypto.randomBytes(64).toString('hex'), 'urn:mage');

  const BearerStrategy = require('passport-http-bearer').Strategy
    , User = require('../models/user')
    , Token = require('../models/token');

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    User.getUserById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use(new BearerStrategy({
    passReqToCallback: true
  },
  function(req, token, done) {
    Token.getToken(token, function(err, credentials) {
      if (err) { return done(err); }

      if (!credentials || !credentials.user) {
        return done(null, false);
      }

      req.token = credentials.token;

      if (credentials.token.deviceId) {
        req.provisionedDeviceId = credentials.token.deviceId;
      }

      return done(null, credentials.user, { scope: 'all' });
    });
  }));

  passport.use('authorization', new BearerStrategy(
  function (token, done) {
    const expectation = {
      assertion: TokenAssertion.Authorized
    };

    tokenService.verifyToken(token, expectation)
      .then(payload => {
        User.getUserById(payload.subject)
          .then(user => done(null, user))
          .catch(err => done(err));
      })
      .catch(err => done(err));
  }));

  function authorize(req, res, next) {
    passport.authenticate('authorization', function (err, user, info = {}) {        
      if (!user) return res.status(401).send(info.message);

      req.user = user;
      next();
    })(req, res, next);
  }

  function provisionDevice(req, res, next) {
    const strategy = req.user.authentication.type;
    provision.check(strategy, function(err, device, info = {}) {
      if (!device || !device.registered) return res.status(403).send(info.message);

      req.provisionedDevice = device;
      next();
    })(req, res, next);
  }

  function parseLoginMetadata(req, res, next) {
    req.loginOptions = {
      userAgent: req.headers['user-agent'],
      appVersion: req.param('appVersion')
    };

    next();
  }

  app.post(
    '/auth/token',
    authorize,
    provisionDevice,
    parseLoginMetadata,
    function (req, res, next) {
      new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function (err, token) {
        if (err) return next(err);

        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, { path: req.getRoot() }),
          device: req.provisionedDevice,
          api: config.api
        });
      });

      req.session = null;
    }
  );

  // Setup passport authentication for each strategy in this directory
  Object.keys(strategies).forEach(function (name) {
    require('./' + name)(app, passport, provision, strategies[name], tokenService);
  });

  return {
    passport: passport,
    strategies: strategies
  };
};
