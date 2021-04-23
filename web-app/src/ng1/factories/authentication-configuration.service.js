module.exports = AuthenticationConfigurationService;

AuthenticationConfigurationService.$inject = ['$http', '$httpParamSerializer'];

function AuthenticationConfigurationService($http, $httpParamSerializer) {

    const service = {
        getAllConfigurations: getAllConfigurations,
        updateConfiguration: updateConfiguration,
        deleteConfiguration: deleteConfiguration,
        createConfiguration: createConfiguration
    };

    return service;

    function getAllConfigurations(options) {
        options = options || {};

        return $http.get('/api/authentication/configuration/all', { params: options });
    }

    function updateConfiguration(config) {
        return $http.put('/api/authentication/configuration/update/' + config._id, $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
    }

    function deleteConfiguration(config) {
        return $http.delete('/api/authentication/configuration/delete/' + config._id);
    }

    function createConfiguration(config) {
        return $http.post('/api/authentication/configuration/create/', $httpParamSerializer(config), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
    }
};