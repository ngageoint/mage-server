module.exports = function(provision) {

  var NoneStrategy = require('./strategies/none').Strategy;

  provision.use(new NoneStrategy());

  return {
  	strategy: 'none',
  	provision: provision
  }
}