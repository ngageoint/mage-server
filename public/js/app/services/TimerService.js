angular
  .module('mage')
  .factory('TimerService', TimerService);

TimerService.$inject = [];

function TimerService() {
  var ***REMOVED*** = {
    startTimer: startTimer,
    stopTimer: stopTimer
  };

  return ***REMOVED***;

  function startTimer(name, interval, callback) {
    // Stop the timer if its already running, no-op if not running
    stopTimer(name);

    timers[name] = setInterval(function() {
      callback();
    }, interval);

    // Fire right away, interval will fire again in specified interval
    callback();
  }

  function stopTimer(name) {
    var timer = timers[name];
    if (timer) {
      clearInterval(timer);
      delete timers[name];
    }
  }
}
