angular
  .module('mage')
  .filter('polling', pollingFilter);

function pollingFilter() {
  function filter(input) {
    input = Number(input);
    if (input === 0) return 'No Polling';
    if (input < 60000) {
      return input / 1000 + ' seconds';
    } else {
      return input / 60000 + ' minutes';
    }
    return '';
  }

  filter.$stateful = true;
  return filter;
}
