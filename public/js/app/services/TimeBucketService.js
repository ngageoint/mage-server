'use strict';

/*
   Service will take a set of data and bucket it up based on the time field with a max limit
   Buckets will split on minimum of minute boundaries
*/
angular.module('mage')
  .factory('TimeBucketService', [
    function () {
      var ***REMOVED*** = {};
      var timeFinders = {};

      ***REMOVED***.buckets = {};

      ***REMOVED***.createBuckets = function (data, limit, timefield, save) {
        if (!data || data.length == 0) return;
        var buckets = [];
        var bucketIndex = 0;

        var timeFinder = _.isFunction(timefield) ? timefield : function(item) { return item[timefield]; };

        // group into time buckets first just to consolidate and key for later
        var minuteBuckets = _.groupBy(data, function(item) {
          return timeFinder(item);
        });

        // now take each minute bucket and smash them together into bigger buckets as long as the
        // data in the minute bucket will not surp***REMOVED*** the limit

        var sortedMinutes = _.sortBy(_.keys(minuteBuckets), function(num) { return -Number(num); });

        for (var i = 0; i < sortedMinutes.length; i++) {
          var minuteBucket = minuteBuckets[sortedMinutes[i]];

          if (buckets[bucketIndex] && minuteBucket.length + buckets[bucketIndex].length <= limit) {
            buckets[bucketIndex].push(minuteBucket);
          } else if (!buckets[bucketIndex]) {
             buckets[bucketIndex] = minuteBucket;
          } else {
            buckets[bucketIndex] = _.flatten(buckets[bucketIndex]);
            bucketIndex++;
            buckets[bucketIndex] = minuteBucket;
          }
        }
        buckets[bucketIndex] = _.flatten(buckets[bucketIndex]);

        if (save) {
          ***REMOVED***.buckets[save] = buckets;
        }

        return buckets;
      };

      ***REMOVED***.findItemBucket = function (item, buckets, timeField) {
        var theBuckets = _.isArray(buckets) ? buckets : ***REMOVED***.buckets[buckets];
        var timeFinder = _.isFunction(timeField) ? timeField : function(item) { return item[timeField]; };
        var itemDate = timeFinder(item);
        for (var i = 0; i < theBuckets.length; i++) {
          var b = theBuckets[i];
          if (timeFinder(b[b.length-1]) <= itemDate && timeFinder(b[0]) >= itemDate) {
            return b;
          }
        }
        return;
      };

      ***REMOVED***.findItemBucketIdx = function (item, buckets, timeField) {
        var theBuckets = _.isArray(buckets) ? buckets : ***REMOVED***.buckets[buckets];
        var timeFinder = _.isFunction(timeField) ? timeField : function(item) { return item[timeField]; };
        var itemDate = timeFinder(item);
        for (var i = 0; i < theBuckets.length; i++) {
          var b = theBuckets[i];
          if (timeFinder(b[b.length-1]) <= itemDate && timeFinder(b[0]) >= itemDate) {
            return i;
          }
        }
        return theBuckets.length;
      };

      return ***REMOVED***;
    }]);
