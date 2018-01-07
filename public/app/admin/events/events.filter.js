var _ = require('underscore');

module.exports = EventFilter;

function EventFilter() {
  return function(events, search) {
    if (!search) return events;

    events = (_.isArray(events)) ? events : [events];

    if(!_.isArray(events) || _.isUndefined(search)) {
      return events;
    }

    var match = new RegExp(search, 'i');
    return events.filter(function(element) {
      return match.test(element.name) || match.test(element.description);
    });
  };
}
