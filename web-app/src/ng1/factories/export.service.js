'use strict';

module.exports = ExportService;

ExportService.$inject = ['$http', '$q', '$httpParamSerializer'];

function ExportService($http, $q, $httpParamSerializer) {

    const service = {
        count
    };

    return service;

    function count(options) {
        options = options || {};

        return $http.get('api/export/count', { params: options });
    }
}