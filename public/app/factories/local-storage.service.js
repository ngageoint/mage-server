angular
  .module('mage')
  .factory('LocalStorageService', LocalStorageService);

LocalStorageService.$inject = [];

function LocalStorageService() {
  var tokenKey = 'token';
  var pollingIntervalKey = 'pollingInterval';
  var timeIntervalKey = 'timeInterval';
  var teamsKey = 'teams';

  var service = {
    getToken: getToken,
    setToken: setToken,
    removeToken: removeToken,
    setPollingInterval: setPollingInterval,
    getPollingInterval: getPollingInterval,
    setTimeInterval: setTimeInterval,
    getTimeInterval: getTimeInterval,
    getTeams: getTeams,
    setTeams: setTeams,
    removeTeams: removeTeams
  };

  return service;

  function getToken() {
    return getLocalItem(tokenKey);
  }

  function setToken(token) {
    return setLocalItem(tokenKey, token);
  }

  function removeToken() {
    return removeLocalItem(tokenKey);
  }

  function setPollingInterval(pollingInterval) {
    return setLocalItem(pollingIntervalKey, pollingInterval);
  }

  function getPollingInterval() {
    return getLocalItem(pollingIntervalKey);
  }

  function setTimeInterval(timeInterval) {
    return setLocalItem(timeIntervalKey, JSON.stringify(timeInterval));
  }

  function getTimeInterval() {
    var time = JSON.parse(getLocalItem(timeIntervalKey));
    if (time && time.options) {
        if (time.options.startDate) {
          time.options.startDate = new Date(time.options.startDate);
        }
        if (time.options.endDate) {
          time.options.endDate = new Date(time.options.endDate);
        }
    }
    return time;
  }

  function getTeams() {
    return JSON.parse(getLocalItem(teamsKey));
  }

  function setTeams(teams) {
    return setLocalItem(teamsKey, JSON.stringify(teams));
  }

  function removeTeams() {
    return removeLocalItem(teamsKey);
  }

  function getLocalItem(key) {
    try {
      if ('localStorage' in window && window['localStorage'] !== null) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      return false;
    }
  }

  function setLocalItem(key, value) {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        return localStorage.setItem(key, value);
      }
    } catch (e) {
      return false;
    }
  }

  function removeLocalItem(key) {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        return localStorage.removeItem(key);
      }
    } catch (e) {
      return false;
    }
  }
}
