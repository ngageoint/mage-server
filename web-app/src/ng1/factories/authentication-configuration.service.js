function AuthenticationConfigurationService($http, $httpParamSerializer) {

    const service = {
        getAllConfigurations: getAllConfigurations,
        updateConfiguration: updateConfiguration,
        deleteConfiguration: deleteConfiguration,
        createConfiguration: createConfiguration,
        countUsers: countUsers
    };

    return service;

    function getAllConfigurations(options) {
        options = options || {};

        return $http.get('/api/authentication/configuration/', { params: options });
    }

    function updateConfiguration(config) {
        return $http.put('/api/authentication/configuration/' + config._id, $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
    }

    function deleteConfiguration(config) {
        return $http.delete('/api/authentication/configuration/' + config._id);
    }

    function createConfiguration(config) {
        return $http.post('/api/authentication/configuration/', $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
    }

    function countUsers(id) {
        return $http.get('/api/authentication/configuration/count/' + id);
    }
};

module.exports = AuthenticationConfigurationService;

AuthenticationConfigurationService.$inject = ['$http', '$httpParamSerializer'];