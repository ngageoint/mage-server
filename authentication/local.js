module.exports = function(app, p***REMOVED***port, localStrategy) {

  var log = require('winston')
    , LocalStrategy = require('p***REMOVED***port-local').Strategy
    , User = require('../models/user')
    , api = require('../api')
    , userTransformer = require('../transformers/user');

  p***REMOVED***port.use(new LocalStrategy(
    function(username, p***REMOVED***word, done) {
      User.getUserByUsername(username, function(err, user) {
        if (err) { return done(err); }

        if (!user) {
          log.warn('Failed login attempt: User with username ' + username + ' not found');
          return done(null, false, { message: "User with username '" + username + "' not found" });
        }

        if (!user.active) {
          log.warn('Failed user login attempt: User ' + user.username + ' is not active');
          return done(null, false, { message: "User with username '" + username + "' not active" });
        }

        user.validP***REMOVED***word(p***REMOVED***word, function(err, isValid) {
          if (err) {
            return done(err);
          }

          if (!isValid) {
            log.warn('Failed login attempt: User with username ' + username + ' provided an invalid p***REMOVED***word');
            return done(null, false);
          }

          return done(null, user);
        });
      });
    }
  ));

  app.post(
    '/api/login',
    p***REMOVED***port.authenticate('local'),
    function(req, res) {
      var options = {userAgent: req.headers['user-agent'], appVersion: req.param('appVersion')};
      new api.User().login(req.user, options, function(err, token) {
        res.json({
          token: token.token,
          expirationDate: token.expirationDate,
          user: userTransformer.transform(req.user, {path: req.getRoot()})
        });
      });
    }
  );
}
