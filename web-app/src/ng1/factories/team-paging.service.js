module.exports = TeamPagingService;

TeamPagingService.$inject = ['Team', '$q'];

function TeamPagingService(Team, $q) {

    var service = {
        constructDefault,
        refresh,
        count,
        hasNext,
        next,
        hasPrevious,
        previous,
        teams,
        search
    };

    return service;

    function constructDefault() {
        var itemsPerPage = 10;
        var stateAndData = new Map();
        stateAndData['all'] = {
            countFilter: {},
            teamFilter: { populate: false, limit: itemsPerPage, sort: { name: 1, _id: 1 }, e: { teamEventId: null} },
            searchFilter: '',
            teamCount: 0,
            pageInfo: {}
        };

        return stateAndData;
    }

    function refresh(stateAndData) {

        var promises = [];

        for (const [key, value] of Object.entries(stateAndData)) {

            var promise = $q.all({ count: Team.count(value.countFilter).$promise, pageInfo: Team.query(value.teamFilter).$promise }).then(result => {
                stateAndData[key].teamCount = result.count.count;
                stateAndData[key].pageInfo = result.pageInfo[0];
                $q.resolve(key);
            });

            promises.push(promise);
        }

        return $q.all(promises);
    }

    function count(data) {
        return data.teamCount;
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
        var filter = JSON.parse(JSON.stringify(data.teamFilter));
        filter.start = start;
        return $q.all({pageInfo: Team.query(filter).$promise }).then(result => {
            data.pageInfo = result.pageInfo[0];
            return $q.resolve(data.pageInfo.teams);
        });
    }

    function teams(data) {
        var teams = [];

        if (data.pageInfo && data.pageInfo.teams) {
            teams = data.pageInfo.teams;
        }

        return teams;
    }

    function search(data, teamSearch, nameSearchOnly) {

        if (data.pageInfo == null || data.pageInfo.teams == null) {
            return $q.resolve([]);
        }

        const previousSearch = data.searchFilter;

        var promise = null;

        if (previousSearch == '' && teamSearch == '') {
            //Not performing a seach
            promise = $q.resolve(data.pageInfo.teams);
        } else if (previousSearch != '' && teamSearch == '') {
            //Clearing out the search
            data.searchFilter = '';
            delete data.teamFilter['or'];

            promise = $q.all({pageInfo: Team.query(data.teamFilter).$promise }).then(result => {
                data.pageInfo = result.pageInfo[0];
                return $q.resolve(data.pageInfo.teams);
            });
        } else if (previousSearch == teamSearch) {
            //Search is being performed, no need to keep searching the same info over and over
            promise = $q.resolve(data.pageInfo.teams);
        } else {
            //Perform the server side searching
            data.searchFilter = teamSearch;

            var filter = data.teamFilter;
            if(nameSearchOnly) {
                filter.or = {
                    name: '.*' + teamSearch + '.*'
                };
            } else{
                filter.or = {
                    name: '.*' + teamSearch + '.*',
                    description: '.*' + teamSearch + '.*'
                };
            }
           
            promise = $q.all({pageInfo: Team.query(filter).$promise }).then(result => {
                data.pageInfo = result.pageInfo[0];
                return $q.resolve(data.pageInfo.teams);
            });
        }

        return promise;
    }
}