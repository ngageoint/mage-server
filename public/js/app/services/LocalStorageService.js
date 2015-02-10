'use strict';

mage.factory('LocalStorageService', function () {
  var ***REMOVED*** = {};

  ***REMOVED***.getLocalItem = function (key) {
    try {
      if ('localStorage' in window && window['localStorage'] !== null) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.log("HTML5 Local Storage is not available...");
      return false;
    }
  }

  ***REMOVED***.setLocalItem = function (key, value) {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        return localStorage.setItem(key, value);
      }
    } catch (e) {
      console.log("HTML5 Local Storage is not available...");
      return false;
    }
  }

  ***REMOVED***.removeLocalItem = function (key) {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        return localStorage.removeItem(key);
      }
    } catch (e) {
      console.log("HTML5 Local Storage is not available...");
      return false;
    }
  }

  return ***REMOVED***;
});
