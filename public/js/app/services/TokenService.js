'use strict';

mage.factory('TokenService', ['LocalStorageService', function (LocalStorageService) {
  var ***REMOVED*** = {};

  var tokenKey = "token";

  /* URL Param token convenience method */
  ***REMOVED***.getTokenParams = function () {
    return {"access_token" : LocalStorageService.getLocalItem(tokenKey)};
  };

  ***REMOVED***.getToken = function() {
    return LocalStorageService.getLocalItem(tokenKey);
  };

  return ***REMOVED***;

}]);
