const crypto = require('crypto')
  , fs = require('fs-extra')
  , verification = require('./verification')
  , api = require('../api/')
  , config = require('../config.js')
  , userTransformer = require('../transformers/user')
  , authenticationApiAppender = require('../utilities/authenticationApiAppender');

const JWTService = verification.JWTService;
const TokenAssertion = verification.TokenAssertion;

module.exports = function (app, passport, provision) {
  const tokenService = new JWTService(crypto.randomBytes(64).toString('hex'), 'urn:mage');

  const BearerStrategy = require('passport-http-bearer').Strategy
    , User = require('../models/user')
    , Token = require('../models/token');

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    User.getUserById(id, function (err, user) {
      done(err, user);
    });
  });

  passport.use(new BearerStrategy({
    passReqToCallback: true
  },
    function (req, token, done) {
      Token.getToken(token, function (err, credentials) {
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

  passport.use('authorization', new BearerStrategy(function (token, done) {
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
    provision.check(req.user.authentication.type)(req, res, next);
  }

  app.post(
    '/auth/token',
    authorize,
    provisionDevice,
    function (req, res, next) {
      const options = {
        userAgent: req.headers['user-agent'],
        appVersion: req.param('appVersion')
      };

      new api.User().login(req.user, req.provisionedDevice, options, function (err, token) {
        if (err) return next(err);

        authenticationApiAppender.append(config.api).then(api => {
          res.json({
            token: token.token,
            expirationDate: token.expirationDate,
            user: userTransformer.transform(req.user, { path: req.getRoot() }),
            device: req.provisionedDevice,
            api: api
          });
        }).catch(err => {
          next(err);
        });
      });

      req.session = null;
    }
  );

  // Dynamically import all authentication strategies
  fs.readdirSync(__dirname).forEach(function (file) {
    if (file[0] === '.' || file === 'index.js' || file === 'verification.js') return;
    const strategy = file.substr(0, file.indexOf('.'));
    require('./' + strategy)(app, passport, provision, tokenService);
  });

  return {
    passport: passport
  };
};
