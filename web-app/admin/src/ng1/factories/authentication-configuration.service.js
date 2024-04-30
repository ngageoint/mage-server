
function AuthenticationConfigurationService($http, $httpParamSerializer) {

    function getAllConfigurations(options) {
        options = options || {};
        return $http.get('/api/authentication/configuration/', { params: options });
    }

    /**
     * TODO: why is this using form encoding instead of straight json?
     */
    function updateConfiguration(config) {
        return $http.put('/api/authentication/configuration/' + config._id, config, {
            headers: {
                'content-type': 'application/json'
            }
        });
    }

    function deleteConfiguration(config) {
        return $http.delete('/api/authentication/configuration/' + config._id);
    }

    function createConfiguration(config) {
        return $http.post('/api/authentication/configuration/', config, {
            headers: {
                'content-type': 'application/json'
            }
        });
    }

    function countUsers(id) {
        return $http.get('/api/authentication/configuration/count/' + id);
    }

    return {
        getAllConfigurations,
        updateConfiguration,
        deleteConfiguration,
        createConfiguration,
        countUsers
    };
};

module.exports = AuthenticationConfigurationService;

AuthenticationConfigurationService.$inject = ['$http', '$httpParamSerializer'];