'use strict';

angular.module('mage.timerService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('TimerService', [ 
    function () {
      var timers = {};

      var startTimer = function(name, interval, callback) {
        // Stop the timer if its already running, no-op if not running
        stopTimer(name);

        timers[name] = setInterval(function() {
          callback();
        }, interval);

        // Fire right away, interval will fire again in specified interval
        callback();
      }


      var stopTimer = function(name) {
        var timer = timers[name];
        if (timer) {
          clearInterval(timer);
          delete timers[name];
        }
      }

      return {
        start: startTimer,
        stop: stopTimer
      };
    }]);