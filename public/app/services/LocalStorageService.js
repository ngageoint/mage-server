angular
  .module('mage')
  .factory('LocalStorageService', LocalStorageService);

LocalStorageService.$inject = [];

function LocalStorageService() {
  var tokenKey = 'token';

  var ***REMOVED*** = {
    getToken: getToken,
    setToken: setToken
  };

  return ***REMOVED***;

  function getToken() {
    return getLocalItem(tokenKey);
  };

  function setToken(token) {
    return setLocalItem(tokenKey, token);
  }

  function removeToken() {
    return removeLocalItem(tokenKey);
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
