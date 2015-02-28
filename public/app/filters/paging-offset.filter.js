angular
  .module('mage')
  .filter('offset', offsetFilter);

offsetFilter.$inject = ['$parse'];

function offsetFilter($parse) {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
}
