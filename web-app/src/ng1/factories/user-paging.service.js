module.exports = UserPagingService;

UserPagingService.$inject = ['UserService', '$q'];

function UserPagingService(UserService, $q) {

    var service = {
        constructDefault,
        refresh,
        count,
        hasNext,
        next,
        hasPrevious,
        previous,
        users,
        search
    };

    return service;

    function constructDefault() {
        var itemsPerPage = 10;
        var stateAndData = new Map();
        stateAndData['all'] = {
            countFilter: {},
            userFilter: { limit: itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };
        stateAndData['active'] = {
            countFilter: { active: true },
            userFilter: { active: true, limit: itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };
        stateAndData['inactive'] = {
            countFilter: { active: false },
            userFilter: { active: false, limit: itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };
        stateAndData['disabled'] = {
            countFilter: { enabled: false },
            userFilter: { enabled: false, limit: itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };

        return stateAndData;
    }

    function refresh(stateAndData) {

        var promises = [];

        for (const [key, value] of Object.entries(stateAndData)) {

            var promise = UserService.getUserCount(value.countFilter).then(result => {
                return Promise.resolve(result.data.count);
            }).then(count => {
                stateAndData[key].userCount = count;
                return UserService.getAllUsers(value.userFilter);
            }).then((pageInfo => {
                stateAndData[key].pageInfo = pageInfo;
                return Promise.resolve(key);
            }));

            promises.push(promise);
        }

        return Promise.all(promises);
    }

    function count(data) {
        return data.userCount;
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
        var filter = JSON.parse(JSON.stringify(data.userFilter));
        filter.start = start;
        return UserService.getAllUsers(filter).then(pageInfo => {
            data.pageInfo = pageInfo;
            return Promise.resolve(pageInfo);
        });
    }

    function users(data) {
        var users = [];

        if (data.pageInfo && data.pageInfo.users) {
            users = data.pageInfo.users;
        }

        return users;
    }

    function search(data, userSearch) {

        if (data.pageInfo == null || data.pageInfo.users == null) {
            return Promise.resolve([]);
        }

        const previousSearch = data.searchFilter;

        var promise = null;

        if (previousSearch == '' && userSearch == '') {
            //Not performing a seach
            promise = Promise.resolve([]);
        } else if (previousSearch != '' && userSearch == '') {
            //Clearing out the search
            data.searchFilter = '';
            delete data.userFilter['or'];

            promise = UserService.getAllUsers(data.userFilter).then(pageInfo => {
                data.pageInfo = pageInfo;
            });
        } else if (previousSearch == userSearch) {
            //Search is being performed, no need to keep searching the same info over and over
            promise = Promise.resolve([]);
        } else {
            //Perform the server side searching
            data.searchFilter = userSearch;

            var filter = data.userFilter;
            filter.or = {
                displayName: '.*' + userSearch + '.*',
                email: '.*' + userSearch + '.*'
            };
            promise = UserService.getAllUsers(filter).then(pageInfo => {
                data.pageInfo = pageInfo;
            });
        }

        return promise;
    }
}
