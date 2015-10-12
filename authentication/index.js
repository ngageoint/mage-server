module.exports = function(app, p***REMOVED***port, provision, strategies) {

  var BearerStrategy = require('p***REMOVED***port-http-bearer').Strategy
    , User = require('../models/user')
    , Token = require('../models/token');

  p***REMOVED***port.serializeUser(function(user, done) {
    done(null, user._id);
  });

  p***REMOVED***port.deserializeUser(function(id, done) {
    User.getUserById(id, function(err, user) {
      done(err, user);
    });
  });

  p***REMOVED***port.use(new BearerStrategy({
    p***REMOVED***ReqToCallback: true
  },
  function(req, token, done) {
    console.log('validate token%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%', token);
    Token.getToken(token, function(err, credentials) {
      if (err) { return done(err); }

      if (!credentials || !credentials.user) { return done(null, false); }

      req.token = credentials.token;

      console.log('got credentials%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%', credentials);

      return done(null, credentials.user, { scope: 'all' });
    });
  }));

  Object.keys(strategies).forEach(function(name) {
    // setup p***REMOVED***port authentication for this strategy
    require('./' + name)(app, p***REMOVED***port, provision, strategies[name]);
  });

  return {
    p***REMOVED***port: p***REMOVED***port,
    strategies: strategies
  };
}
