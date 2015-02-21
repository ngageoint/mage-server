angular
  .module('mage')
  .factory('TokenService', TokenService);

TokenService.$inject = ['LocalStorageService'];

function TokenService(LocalStorageService) {
  var tokenKey = "token";

  var ***REMOVED*** = {
    getToken: getToken,
    getTokenParams: getTokenParams,
    setToken: setToken
  }

  return ***REMOVED***;

  /* URL Param token convenience method */
  function getTokenParams() {
    return {"access_token" : LocalStorageService.getLocalItem(tokenKey)};
  };

  function getToken() {
    return LocalStorageService.getLocalItem(tokenKey);
  };

  function setToken(token) {
    LocalStorageService.setLocalItem(tokenKey, token);
  }
}
