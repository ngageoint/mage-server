angular.module('mage').filter('p***REMOVED***word', function() {
  return function(text) {
    if (!text) return null;

    return text.replace(/./g, "*");
  };
});
