module.exports = function(passport) {

  var BearerStrategy = require('passport-http-bearer').Strategy
    , config = require('./config.json');

  passport.use('geoserver-bearer', new BearerStrategy(
    function(token, done) {
      return done(null, token === config.token);
    })
  );
};
