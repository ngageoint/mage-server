module.exports = function(p***REMOVED***port, nodels) {

  var LocalStrategy = require('p***REMOVED***port-local').Strategy;

  p***REMOVED***port.use(new LocalStrategy(
    function(username, p***REMOVED***word, done) {
      console.log('trying to auth user: '+ username + ' with p***REMOVED***word: ' + p***REMOVED***word);
      models.User.getUserByUsername(username, function(err, user) {
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