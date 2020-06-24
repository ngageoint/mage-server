module.exports = DevicePagingService;

DevicePagingService.$inject = ['DeviceService', '$q'];

function DevicePagingService(DeviceService, $q) {

    var service = {
        constructDefault,
        refresh,
        count,
        hasNext,
        next,
        hasPrevious,
        previous,
        devices,
        search
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

    function refresh(stateAndData) {

        var promises = [];

        for (const [key, value] of Object.entries(stateAndData)) {

            var promise = $q.all({ count: DeviceService.count(value.countFilter), pageInfo: DeviceService.getAllDevices(value.deviceFilter) }).then(result => {
                stateAndData[key].deviceCount = result.count.data.count;
                stateAndData[key].pageInfo = result.pageInfo;
                $q.resolve(key);
            });

            promises.push(promise);
        }

        return $q.all(promises);
    }

    function count(data) {
        return data.deviceCount;
    }

    function hasNext(data) {
        var status = false;

        if (data.pageInfo && data.pageInfo.links) {
            status = data.pageInfo.links.next != null &&
                data.pageInfo.links.next !== "";
        }

        return status;
    }

    function next(data) {
        return move(data.pageInfo.links.next, data);
    }

    function hasPrevious(data) {
        var status = false;

        if (data.pageInfo && data.pageInfo.links) {
            status = data.pageInfo.links.prev != null &&
                data.pageInfo.links.prev !== "";
        }

        return status;
    }

    function previous(data) {
        return move(data.pageInfo.links.prev, data);
    }

    function move(start, data) {
        var filter = JSON.parse(JSON.stringify(data.deviceFilter));
        filter.start = start;
        return DeviceService.getAllDevices(filter).then(pageInfo => {
            data.pageInfo = pageInfo;
            return $q.resolve(pageInfo.devices);
        });
    }

    function devices(data) {
        var devices = [];

        if (data.pageInfo && data.pageInfo.devices) {
            devices = data.pageInfo.devices;
        }

        return devices;
    }

    /**
     * Search against devices or users
     * 
     * @param {*} data 
     * @param {*} deviceSearch 
     * @param {*} userSearch leave null to search for devices
     */
    function search(data, deviceSearch, userSearch) {

        if (data.pageInfo == null || data.pageInfo.devices == null) {
            return $q.resolve([]);
        }

        const previousSearch = data.searchFilter;

        var promise = null;

        if (previousSearch == '' && deviceSearch == '') {
            //Not performing a seach
            promise = $q.resolve(data.pageInfo.devices);
        } else if (previousSearch != '' && deviceSearch == '') {
            //Clearing out the search
            data.searchFilter = '';
            delete data.deviceFilter['or'];
            delete data.deviceFilter['expand'];
            delete data.deviceFilter['user'];

            promise = DeviceService.getAllDevices(data.deviceFilter).then(pageInfo => {
                data.pageInfo = pageInfo;
                return $q.resolve(data.pageInfo.devices);
            });
        } else if (previousSearch == deviceSearch && userSearch == null) {
            //Search is being performed, no need to keep searching the same info over and over
            promise = $q.resolve(data.pageInfo.devices);
        } else {
            //Perform the server side searching
            data.searchFilter = deviceSearch;

            var filter = data.deviceFilter;
            if (userSearch == null) {
                filter.or = {
                    userAgent: '.*' + deviceSearch + '.*',
                    description: '.*' + deviceSearch + '.*',
                    uid:  '.*' + deviceSearch + '.*'
                };
            } else {
                filter.or = {
                    displayName: '.*' + userSearch + '.*',
                    email: '.*' + userSearch + '.*'
                };
                filter.expand = 'user';
                filter.user = true;
            }

            promise = DeviceService.getAllDevices(filter).then(pageInfo => {
                data.pageInfo = pageInfo;
                return $q.resolve(data.pageInfo.devices)
            });
        }

        return promise;
    }
}