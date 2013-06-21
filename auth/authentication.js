module.exports = function(strategy, models) {

  var p***REMOVED***port = require('p***REMOVED***port'), 
      BearerStrategy = require('p***REMOVED***port-http-bearer').Strategy;

  p***REMOVED***port.serializeUser(function(user, done) {
    done(null, user._id);
  });

  p***REMOVED***port.deserializeUser(function(id, done) {
    models.User.getUserById(id, function(err, user) {
      done(err, user);
    });
  });

  p***REMOVED***port.use(new BearerStrategy(
    function(token, done) {
      models.Token.getUserForToken(token, function(err, user) {
        console.log('trying to get token: ' + token);
        if (err) { return done(err); }

        if (!user) { return done(null, false); }

        console.log("found user for token: " + token.user)
        return done(null, user, { scope: 'all' });
      });
    }
  ));

  var authentication = require('./' + strategy)(p***REMOVED***port, models);

  return authentication;
}