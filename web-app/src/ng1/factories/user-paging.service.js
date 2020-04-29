module.exports = UserPagingService;

UserPagingService.$inject = ['UserService', '$q'];

function UserPagingService(UserService, $q) {
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

    var service = {
        stateAndData,
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

    function refresh() {

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

    function count(state) {
        return stateAndData[state].userCount;
    }

    function hasNext(state) {
        var status = false;

        if (stateAndData[state].pageInfo && stateAndData[state].pageInfo.links) {
            status = stateAndData[state].pageInfo.links.next != null &&
                stateAndData[state].pageInfo.links.next !== "";
        }

        return status;
    }

    function next(state) {
        return move(stateAndData[state].pageInfo.links.next, state);
    }

    function hasPrevious(state) {
        var status = false;

        if (stateAndData[state].pageInfo && stateAndData[state].pageInfo.links) {
            status = stateAndData[state].pageInfo.links.prev != null &&
                stateAndData[state].pageInfo.links.prev !== "";
        }

        return status;
    }

    function previous(state) {
        return move(stateAndData[state].pageInfo.links.prev, state);
    }

    function move(start, state) {
        var filter = JSON.parse(JSON.stringify(stateAndData[state].userFilter));
        filter.start = start;
        return UserService.getAllUsers(filter).then(pageInfo => {
            stateAndData[state].pageInfo = pageInfo;
            return Promise.resolve(pageInfo);
        });
    }

    function users(state) {
        var users = [];

        if (stateAndData[state].pageInfo && stateAndData[state].pageInfo.users) {
            users = stateAndData[state].pageInfo.users;
        }

        return users;
    }

    function search(state, userSearch) {

        if (stateAndData[state].pageInfo == null || stateAndData[state].pageInfo.users == null) {
            return Promise.resolve([]);
        }

        const previousSearch = stateAndData[state].searchFilter;

        var promise = null;

        if (previousSearch == '' && userSearch == '') {
            //Not performing a seach
            promise = Promise.resolve([]);
        } else if (previousSearch != '' && userSearch == '') {
            //Clearing out the search
            stateAndData[state].searchFilter = '';
            delete stateAndData[state].userFilter['or'];

            promise = UserService.getAllUsers(stateAndData[state].userFilter).then(pageInfo => {
                stateAndData[state].pageInfo = pageInfo;
            });
        } else if (previousSearch == userSearch) {
            //Search is being performed, no need to keep searching the same info over and over
            promise = Promise.resolve([]);
        } else {
            //Perform the server side searching
            stateAndData[state].searchFilter = userSearch;

            var filter = stateAndData[state].userFilter;
            filter.or = {
                displayName: '.*' + userSearch + '.*',
                email: '.*' + userSearch + '.*'
            };
            promise = UserService.getAllUsers(filter).then(pageInfo => {
                stateAndData[state].pageInfo = pageInfo;
            });
        }

        return promise;
    }
}
