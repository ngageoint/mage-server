angular
  .module('mage')
  .service('PollingService', PollingService);

PollingService.$inject = ['LocalStorageService'];

function PollingService(LocalStorageService) {
  var listeners = [];
  var pollingInterval = LocalStorageService.getPollingInterval();
  if (!pollingInterval || parseInt(pollingInterval) === 0 || Number.isNaN(parseInt(pollingInterval))) {
    pollingInterval = 30000;
  }

  var service = {
    addListener: addListener,
    removeListener: removeListener,
    setPollingInterval: setPollingInterval,
    getPollingInterval: getPollingInterval
  };

  return service;

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
    pollingInterval = interval;
    LocalStorageService.setPollingInterval(pollingInterval);
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onPollingIntervalChanged)) {
        listener.onPollingIntervalChanged(interval);
      }
    });
  }

  function getPollingInterval() {
    return pollingInterval;
  }
}
