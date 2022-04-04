module.exports = LocalStorageService;

LocalStorageService.$inject = [];

function LocalStorageService() {
  var tokenKey = 'token';
  var pollingIntervalKey = 'pollingInterval';
  var timeIntervalKey = 'timeInterval';
  var teamsKey = 'teams';
  var mapPositionKey = 'mapPosition';
  var coordinateSystemViewKey = 'coordinateSystemView';
  var coordinateSystemEditKey = 'coordinateSystemEdit';
  var timeZoneViewKey = 'timeZoneView';
  var timeZoneEditKey = 'timeZoneEdit';
  var timeFormatKey = 'timeFormat';

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
    removeTeams: removeTeams,
    getMapPosition: getMapPosition,
    setMapPosition: setMapPosition,
    getCoordinateSystemView: getCoordinateSystemView,
    setCoordinateSystemView: setCoordinateSystemView,
    getCoordinateSystemEdit: getCoordinateSystemEdit,
    setCoordinateSystemEdit: setCoordinateSystemEdit,
    getTimeZoneView: getTimeZoneView,
    setTimeZoneView: setTimeZoneView,
    getTimeZoneEdit: getTimeZoneEdit,
    setTimeZoneEdit: setTimeZoneEdit,
    getTimeFormat: getTimeFormat,
    setTimeFormat: setTimeFormat
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

  function setMapPosition(mapPosition) {
    return setLocalItem(mapPositionKey, JSON.stringify(mapPosition));
  }

  function getMapPosition() {
    return JSON.parse(getLocalItem(mapPositionKey));
  }

  function getCoordinateSystemView() {
    return getLocalItem(coordinateSystemViewKey) || 'wgs84';
  }

  function setCoordinateSystemView(coordinateSystem) {
    return setLocalItem(coordinateSystemViewKey, coordinateSystem);
  }

  function getCoordinateSystemEdit() {
    return getLocalItem(coordinateSystemEditKey) || getCoordinateSystemView();
  }

  function setCoordinateSystemEdit(coordinateSystem) {
    return setLocalItem(coordinateSystemEditKey, coordinateSystem);
  }

  function getTimeZoneView() {
    return getLocalItem(timeZoneViewKey) || 'local';
  }

  function setTimeZoneView(timeZone) {
    return setLocalItem(timeZoneViewKey, timeZone);
  }

  function getTimeZoneEdit() {
    return getLocalItem(timeZoneEditKey) || getTimeZoneView();
  }

  function setTimeZoneEdit(timeZone) {
    return setLocalItem(timeZoneEditKey, timeZone);
  }

  function getTimeFormat() {
    return getLocalItem(timeFormatKey) || 'absolute';
  }

  function setTimeFormat(timeFormat) {
    return setLocalItem(timeFormatKey, timeFormat);
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
