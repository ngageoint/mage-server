module.exports = function(passport) {

  var AnonymousStrategy = require('passport-anonymous').Strategy;
  passport.use(new AnonymousStrategy());

  return {
  	loginStrategy: 'anonymous',
  	authenticationStrategy: 'anonymous',
  	passport: passport
  }
}