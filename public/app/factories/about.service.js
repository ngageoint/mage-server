angular
  .module('mage')
  .factory('AboutService', AboutService);

AboutService.$inject = ['$http'];

function AboutService($http) {
  var service = {
    about: about
  };

  return service;

  function about() {
    return $http.get('/api/');
  }
}
