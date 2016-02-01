angular
  .module('mage')
  .filter('offset', offsetFilter);

offsetFilter.$inject = [];

function offsetFilter() {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
}
