module.exports = function(options) {

  var p***REMOVED***port = require('p***REMOVED***port')
    , BearerStrategy = require('p***REMOVED***port-http-bearer').Strategy
    , provision = require('../provision')
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

  p***REMOVED***port.use(new BearerStrategy(
    function(token, done) {
      Token.getUserForToken(token, function(err, user) {
        if (err) { return done(err); }

        if (!user) { return done(null, false); }

        return done(null, user, { scope: 'all' });
      });
    }
  ));

  // setup p***REMOVED***port authentication
  require('./' + options.authenticationStrategy)(p***REMOVED***port);

  // setup provisioning
  require('../provision/' + options.provisionStrategy)(provision);

  return {
    authenticationStrategy: options.authenticationStrategy,
    p***REMOVED***port: p***REMOVED***port,
    provisionStrategy: options.provisionStrategy,
    provision: provision
  };
}