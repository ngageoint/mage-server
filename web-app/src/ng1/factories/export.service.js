'use strict';

module.exports = ExportService;

ExportService.$inject = ['$http'];

function ExportService($http) {

    const service = {
        count,
        export: performExport
    };

    return service;

    function count(options) {
        options = options || {};

        return $http.get('/api/exports/count', { params: options });
    }

    function performExport(type, options) {
        const url = "/api/exports/" + type;
        return $http.get(url, {params: options});
    }
}