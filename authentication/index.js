module.exports = function(app, passport, provision, strategies) {

  var BearerStrategy = require('passport-http-bearer').Strategy
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

      if (!credentials || !credentials.user) { return done(null, false); }

      req.token = credentials.token;

      if (credentials.token.deviceId) {
        req.provisionedDeviceId = credentials.token.deviceId;
      }

      return done(null, credentials.user, { scope: 'all' });
    });
  }));

  Object.keys(strategies).forEach(function(name) {
    // setup passport authentication for this strategy
    require('./' + name)(app, passport, provision, strategies[name]);
  });

  return {
    passport: passport,
    strategies: strategies
  };
};
