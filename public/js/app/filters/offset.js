angular.module('mage').filter('offset', ['$parse', function($parse) {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
}]);
