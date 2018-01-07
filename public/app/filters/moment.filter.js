var moment = require('moment');

module.exports = MomentFilter;

function MomentFilter() {
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
