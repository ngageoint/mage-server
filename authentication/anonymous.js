function init(app, passport) {

  const AnonymousStrategy = require('passport-anonymous').Strategy;
  passport.use(new AnonymousStrategy());

  return {
    loginStrategy: 'anonymous',
    authenticationStrategy: 'anonymous',
    passport: passport
  };
};

module.exports = {
  init
}