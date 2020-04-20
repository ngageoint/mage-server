export default class PagingHelper {
    constructor(userService) {
        this.UserService = userService;

        this.previousSearch = '';
        this.itemsPerPage = 10;

        this.stateAndData = new Map();

        this.stateAndData['all'] = {
            countFilter: {},
            userFilter: { limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            userCount: 0,
            pageInfo: {}
        };
        this.stateAndData['active'] = {
            countFilter: { active: true },
            userFilter: { active: true, limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            userCount: 0,
            pageInfo: {}
        };
        this.stateAndData['inactive'] = {
            countFilter: { active: false },
            userFilter: { active: false, limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            userCount: 0,
            pageInfo: {}
        };
        this.stateAndData['disabled'] = {
            countFilter: { enabled: false },
            userFilter: { enabled: false, limit: this.itemsPerPage, sort: { displayName: 1, _id: 1 } },
            userCount: 0,
            pageInfo: {}
        };


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

    users(state, userSearch) {

        if(this.stateAndData[state].pageInfo == null || this.stateAndData[state].pageInfo.users == null) {
            return [];
        }

        if (this.stateAndData[state].pageInfo.users.length == this.count(state)) {
            //Search may or may not be occuring, but the dataset is so small,
            //we will just do client side filtering
        } else if (this.previousSearch == '' && userSearch == '') {
            //Not performing a seach
        } else if (this.previousSearch != '' && userSearch == '') {
            //Clearing out the search
            this.previousSearch = '';
            delete this.stateAndData[state].userFilter['or'];

            this.UserService.getAllUsers(this.stateAndData[state].userFilter).then(pageInfo => {
                this.stateAndData[state].pageInfo = pageInfo;
            });
        } else if (this.previousSearch == userSearch) {
            //Search is being performed, no need to keep searching the same info over and over
        } else {
            //Perform the server side searching
            this.previousSearch = userSearch;

            var filter = this.stateAndData[state].userFilter;
            filter.or = {
                displayName: '.*' + userSearch + '.*',
                email: '.*' + userSearch + '.*'
            };
            this.UserService.getAllUsers(filter).then(pageInfo => {
                this.stateAndData[state].pageInfo = pageInfo;
            });
        }

        var users = [];

        if(this.stateAndData[state].pageInfo && this.stateAndData[state].pageInfo.users) {
            users = this.stateAndData[state].pageInfo.users;
        }

        return users;
    }

    activateUser(user) {
        var users = _.reject(this.stateAndData['inactive'].pageInfo.users, u => { return u.id === user.id; });
        this.stateAndData['inactive'].pageInfo.users = users;
        this.stateAndData['inactive'].userCount = this.stateAndData['inactive'].userCount - 1;

        this.stateAndData['active'].pageInfo.users.push(user);
        this.stateAndData['active'].userCount = this.stateAndData['active'].userCount + 1;
    }

    enableUser(user){
        var users = _.reject(this.stateAndData['disabled'].pageInfo.users, u => { return u.id === user.id; });
        this.stateAndData['disabled'].pageInfo.users = users;
        this.stateAndData['disabled'].userCount = this.stateAndData['disabled'].userCount - 1;
    }
}