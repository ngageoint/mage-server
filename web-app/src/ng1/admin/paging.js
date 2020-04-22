export default class PagingHelper {
    constructor(userService, refresh = true) {
        this.UserService = userService;

        this.itemsPerPage = 10;

        this.stateAndData = new Map();
        this.stateAndData['all'] = {
            countFilter: {},
            userFilter: { limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };
        this.stateAndData['active'] = {
            countFilter: { active: true },
            userFilter: { active: true, limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };
        this.stateAndData['inactive'] = {
            countFilter: { active: false },
            userFilter: { active: false, limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };
        this.stateAndData['disabled'] = {
            countFilter: { enabled: false },
            userFilter: { enabled: false, limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            searchFilter: '',
            userCount: 0,
            pageInfo: {}
        };

        if (refresh) {
            this.refresh();
        }
    }

    refresh() {
        for (const [key, value] of Object.entries(this.stateAndData)) {

            this.UserService.getUserCount(value.countFilter).then(result => {
                if (result && result.data && result.data.count) {
                    this.stateAndData[key].userCount = result.data.count;
                }
            });

            this.UserService.getAllUsers(value.userFilter).then(pageInfo => {
                this.stateAndData[key].pageInfo = pageInfo;
            });
        }
    }

    count(state) {
        return this.stateAndData[state].userCount;
    }

    hasNext(state) {
        var status = false;

        if (this.stateAndData[state].pageInfo && this.stateAndData[state].pageInfo.links) {
            status = this.stateAndData[state].pageInfo.links.next != null &&
                this.stateAndData[state].pageInfo.links.next !== "";
        }

        return status;
    }

    next(state) {
        this.move(this.stateAndData[state].pageInfo.links.next, state);
    }

    hasPrevious(state) {
        var status = false;

        if (this.stateAndData[state].pageInfo && this.stateAndData[state].pageInfo.links) {
            status = this.stateAndData[state].pageInfo.links.prev != null &&
                this.stateAndData[state].pageInfo.links.prev !== "";
        }

        return status;
    }

    previous(state) {
        this.move(this.stateAndData[state].pageInfo.links.prev, state);
    }

    move(start, state) {
        var filter = JSON.parse(JSON.stringify(this.stateAndData[state].userFilter));
        filter.start = start;
        this.UserService.getAllUsers(filter).then(pageInfo => {
            this.stateAndData[state].pageInfo = pageInfo;
        });
    }

    users(state) {
        var users = [];

        if (this.stateAndData[state].pageInfo && this.stateAndData[state].pageInfo.users) {
            users = this.stateAndData[state].pageInfo.users;
        }

        return users;
    }

    search(state, userSearch) {

        if (this.stateAndData[state].pageInfo == null || this.stateAndData[state].pageInfo.users == null) {
            return Promise.resolve([]);
        }

        const previousSearch = this.stateAndData[state].searchFilter;

        var promise = null;

        if (previousSearch == '' && userSearch == '') {
            //Not performing a seach
            promise = Promise.resolve([]);
        } else if (previousSearch != '' && userSearch == '') {
            //Clearing out the search
            this.stateAndData[state].searchFilter = '';
            delete this.stateAndData[state].userFilter['or'];

            promise = this.UserService.getAllUsers(this.stateAndData[state].userFilter).then(pageInfo => {
                this.stateAndData[state].pageInfo = pageInfo;
            });
        } else if (previousSearch == userSearch) {
            //Search is being performed, no need to keep searching the same info over and over
            promise = Promise.resolve([]);
        } else {
            //Perform the server side searching
            this.stateAndData[state].searchFilter = userSearch;

            var filter = this.stateAndData[state].userFilter;
            filter.or = {
                displayName: '.*' + userSearch + '.*',
                email: '.*' + userSearch + '.*'
            };
            promise = this.UserService.getAllUsers(filter).then(pageInfo => {
                this.stateAndData[state].pageInfo = pageInfo;
            });
        }

        return promise;
    }

    activateUser(user) {
        var users = _.reject(this.stateAndData['inactive'].pageInfo.users, u => { return u.id === user.id; });
        this.stateAndData['inactive'].pageInfo.users = users;
        this.stateAndData['inactive'].userCount = this.stateAndData['inactive'].userCount - 1;

        this.stateAndData['active'].pageInfo.users.push(user);
        this.stateAndData['active'].userCount = this.stateAndData['active'].userCount + 1;
    }

    enableUser(user) {
        var users = _.reject(this.stateAndData['disabled'].pageInfo.users, u => { return u.id === user.id; });
        this.stateAndData['disabled'].pageInfo.users = users;
        this.stateAndData['disabled'].userCount = this.stateAndData['disabled'].userCount - 1;
    }
}