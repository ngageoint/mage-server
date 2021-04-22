module.exports = AuthenticationConfigurationService;

AuthenticationConfigurationService.$inject = ['$http', '$q', '$httpParamSerializer'];

function AuthenticationConfigurationService($http, $q, $httpParamSerializer) {

    const service = {
        getAllConfigurations: getAllConfigurations,
        updateConfiguration: updateConfiguration,
        deleteConfiguration: deleteConfiguration,
        createConfiguration: createConfiguration
    };

    return service;

    function getAllConfigurations(options) {
        options = options || {};

        const deferred = $q.defer();

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

        $http.put('/api/authentication/configuration/update/' + config._id, $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }).success(function () {
            deferred.resolve(config);
        }).error(function () {
            deferred.reject();
        });

        return deferred.promise;
    }

    function deleteConfiguration(config) {
        const deferred = $q.defer();

        $http.delete('/api/authentication/configuration/delete/' + config._id, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }).success(function () {
            deferred.resolve(config);
        }).error(function () {
            deferred.reject();
        });

        return deferred.promise;
    }

    function createConfiguration(config) {
        const deferred = $q.defer();

        $http.put('/api/authentication/configuration/create/' + config._id, $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }).success(function () {
            deferred.resolve(config);
        }).error(function () {
            deferred.reject();
        });

        return deferred.promise;
    }
};