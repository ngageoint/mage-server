module.exports = DevicePagingService;

DevicePagingService.$inject = ['DeviceService', '$q'];

function DevicePagingService(DeviceService, $q) {

    var service = {
        constructDefault
    };

    return service;

    function constructDefault() {
        var itemsPerPage = 10;
        var stateAndData = new Map();
        stateAndData['all'] = {
            countFilter: {},
            deviceFilter: { limit: itemsPerPage, sort: { userAgent: 1, _id: 1 } },
            searchFilter: '',
            deviceCount: 0,
            pageInfo: {}
        };
        stateAndData['registered'] = {
            countFilter: { registered: true },
            deviceFilter: { registered: true, limit: itemsPerPage, sort: { userAgent: 1, _id: 1 } },
            searchFilter: '',
            deviceCount: 0,
            pageInfo: {}
        };
        stateAndData['unregistered'] = {
            countFilter: { registered: false },
            deviceFilter: { registered: false, limit: itemsPerPage, sort: { userAgent: 1, _id: 1 } },
            searchFilter: '',
            deviceCount: 0,
            pageInfo: {}
        };

        return stateAndData;
    }
}