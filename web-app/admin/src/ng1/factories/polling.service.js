const _ = require('underscore');

function PollingService(LocalStorageService) {
  let listeners = [];
  let pollingInterval = LocalStorageService.getPollingInterval();
  if (!pollingInterval || parseInt(pollingInterval) === 0 || Number.isNaN(parseInt(pollingInterval))) {
    pollingInterval = 30000;
  }

  function addListener(listener) {
    listeners.push(listener);

    if (_.isFunction(listener.onPollingIntervalChanged)) {
      listener.onPollingIntervalChanged(pollingInterval);
    }
  }

  function removeListener(listener) {
    listeners = _.reject(listeners, function(l) { return listener === l; });
  }

  function setPollingInterval(interval) {
    if (parseInt(interval) !== 0) {
      pollingInterval = interval;
    }
    LocalStorageService.setPollingInterval(interval);
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onPollingIntervalChanged)) {
        listener.onPollingIntervalChanged(interval);
      }
    });
  }

  function getPollingInterval() {
    return pollingInterval;
  }

  const service = {
    addListener: addListener,
    removeListener: removeListener,
    setPollingInterval: setPollingInterval,
    getPollingInterval: getPollingInterval
  };

  return service;
}

PollingService.$inject = ['LocalStorageService'];

module.exports = PollingService;
