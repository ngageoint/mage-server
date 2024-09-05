const AuthenticationInitializer = require('./index');

function initialize() {
  const passport = AuthenticationInitializer.passport;

  const AnonymousStrategy = require('passport-anonymous').Strategy;
  passport.use(new AnonymousStrategy());

  return {
    loginStrategy: 'anonymous',
    authenticationStrategy: 'anonymous',
    passport: passport
  };
};

module.exports = {
  initialize
}