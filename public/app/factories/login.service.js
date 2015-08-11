angular
  .module('mage')
  .factory('LoginService', LoginService);

LoginService.$inject = ['$http'];

function LoginService($http) {

	var ***REMOVED*** = {
    query: query
  };

	return ***REMOVED***;

	function query(options) {
		var options = options || {};
    var filter = options.filter || {};

    var parameters = {};
    if (filter.user) {
      parameters.userId = filter.user.id;
    }
    if (filter.device) {
      parameters.deviceId = filter.device.id;
    }
    if (filter.startDate) {
      parameters.startDate = moment(filter.startDate).toISOString();
    }
    if (filter.endDate) {
      parameters.endDate = moment(filter.endDate).toISOString();
    }
    if (options.limit) {
      parameters.limit = options.limit;
    }


		return $http.get(options.url || '/api/logins?' + $.param(parameters));
	}
}
