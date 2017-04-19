angular
  .module('mage')
  .filter('moment', momentFilter);

function momentFilter() {
  function filter(input, format) {
    if (!input) return null;

    if (format === 'fromNow') {
      return  moment(input).fromNow();
    } else if (format === 'humanize') {
      return moment.duration(Number(input), 'milliseconds').humanize();
    } else if (format) {
      return moment(input).format(format);
    }

    return input;
  }

  filter.$stateful = true;
  return filter;
}
