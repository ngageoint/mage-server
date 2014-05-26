'use strict';

mage.factory('FilterService', ['mageLib',
  function (mageLib) {
    var localStorageKey = 'FilterService.interval';

    var ***REMOVED*** = {};

    var interval = {};

    ***REMOVED***.formatInterval = function() {
      if (interval.since != null) {
        return { start: moment().utc().subtract('seconds', interval.since).toISOString() };
      } else if (interval.today) {
        return { start: moment().utc().startOf('day').toISOString() };
      } else if (interval.start || interval.end) {
        return { start: interval.start, end: interval.end };
      } else {
        return null;
      }
    }

    ***REMOVED***.getTimeInterval = function() {
      return interval;
    };

    ***REMOVED***.setTimeInterval = function(newInterval) {
      interval = newInterval || {};
    }

    return ***REMOVED***;
  }]);
