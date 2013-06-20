module.exports = function(User) {

  var p***REMOVED***port = require('p***REMOVED***port'), 
      LocalStrategy = require('p***REMOVED***port-local').Strategy;

  p***REMOVED***port.serializeUser(function(user, done) {
    console.log('serialize user: ' + user._id);
    done(null, user._id);
  });

  p***REMOVED***port.deserializeUser(function(id, done) {
    console.log('deserialize user: ' + id);
    User.getUserById(id, function(err, user) {
      console.log('found user: ' + user.toString());
      done(err, user);
    });
  });

  p***REMOVED***port.use(new LocalStrategy(
    function(username, p***REMOVED***word, done) {
      console.log('trying to auth user: '+ username + ' with p***REMOVED***word: ' + p***REMOVED***word);
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

  return {
    strategy: 'local',
    p***REMOVED***port: p***REMOVED***port
  };
}