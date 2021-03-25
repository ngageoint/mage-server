module.exports = AuthenticationConfigurationService;

AuthenticationConfigurationService.$inject = ['$http', '$q', '$httpParamSerializer'];

function AuthenticationConfigurationService($http, $q, $httpParamSerializer) {

    const service = {
        getAllConfigurations: getAllConfigurations,
        updateConfiguration: updateConfiguration
    };

    return service;

    function getAllConfigurations(options) {
        options = options || {};

        var deferred = $q.defer();

        $http.get('/api/authentication/configuration/all', { params: options })
            .success(function (configs) {
                deferred.resolve(configs);
            }).error(function () {
                deferred.reject();
            });

        return deferred.promise;
    }

    function updateConfiguration(config) {
        const deferred = $q.defer();

        $http.put('/api/authentication/configuration/' + config._id, $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }).success(function () {
            deferred.resolve(config);
        }).error(function () {
            deferred.reject();
        });

        return deferred.promise;
    }
};