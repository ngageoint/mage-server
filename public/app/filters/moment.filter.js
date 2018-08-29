var moment = require('moment');

module.exports = MomentFilter;

MomentFilter.$inject = ['LocalStorageService'];

function MomentFilter(LocalStorageService) {
  function filter(input) {
    if (!input) return null;

    switch(LocalStorageService.getTimeFormat()) {
    case 'relative':
      return moment(input).fromNow();
    default:
      var timeZone = LocalStorageService.getTimeZoneView();
      if (timeZone === 'gmt') {
        return moment(input).utc().format('MMM D YYYY h:mm A z');
      } else {
        return moment(input).format('MMM D YYYY h:mm A');
      }
    }
  }

  filter.$stateful = true;
  return filter;
}
