angular
  .module('mage')
  .filter('p***REMOVED***word', p***REMOVED***wordFilter);

function p***REMOVED***wordFilter() {
  return function(text) {
    if (!text) return null;

    return text.replace(/./g, "*");
  };
}
