'use strict';

module.exports = ExportService;

ExportService.$inject = ['$http', '$httpParamSerializer'];

function ExportService($http, $httpParamSerializer) {

    const service = {
        getMyExports,
        getAllExports,
        export: performExport,
        deleteExport
    };

    return service;

    function getMyExports() {
        return $http.get('/api/exports/myself');
    }

    function getAllExports() {
        return $http.get('/api/exports');
    }

    function performExport(type, params) {
        params = params || {};
        params.exportType = type;

        return $http.post('/api/exports', $httpParamSerializer(params), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
    }

    function deleteExport(exportId) {
        const url = "/api/exports/" + exportId;
        return $http.delete(url);
    }
}