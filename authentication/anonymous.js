module.exports = function(p***REMOVED***port) {

  var AnonymousStrategy = require('p***REMOVED***port-anonymous').Strategy;
  p***REMOVED***port.use(new AnonymousStrategy());

  return {
  	loginStrategy: 'anonymous',
  	authenticationStrategy: 'anonymous',
  	p***REMOVED***port: p***REMOVED***port
  }
}