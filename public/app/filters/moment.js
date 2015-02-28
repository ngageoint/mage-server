angular.module('mage').filter('moment', function() {
  return function(input, format) {
    if (!input) return null;

  	if (format == 'fromNow') {
  		return moment(input).fromNow();
  	} else if (format) {
  		return moment(input).format(format);
  	}
    return input;
  };
});
