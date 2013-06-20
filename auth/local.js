module.exports = function(User) {

  var p***REMOVED***port = require('p***REMOVED***port'), 
      LocalStrategy = require('p***REMOVED***port-local').Strategy;

  p***REMOVED***port.use(new LocalStrategy(
    function(username, p***REMOVED***word, done) {
      User.getUserByUsername(username, function(err, user) {
        if (err) { return done(err); }

        if (!user) {
          return done(null, false, { message: "User with username '" + username + "' not found" });
        }

        user.validP***REMOVED***word(p***REMOVED***word, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (!isValid) {
            return ('Incorrect p***REMOVED***word');
          }

          return done(null, user);
        });
      });
    }
  ));

  p***REMOVED***port.serializeUser(function(user, done) {
    done(null, user._id);
  });

  p***REMOVED***port.deserializeUser(function(id, done) {
    User.getUserById(id, function(err, user) {
      done(err, user);
    });
  });

  return {
    strategy: 'local',
    p***REMOVED***port: p***REMOVED***port
  };
}