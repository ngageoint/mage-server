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
        return {
            all: {
                countFilter: {},
                searchOptions: { populate: false, limit: 10, sort: { name: 1, _id: 1 }, omit_event_teams: true, term: '' },
                teamCount: 0,
                pageInfo: {}
            }
        };
    }

    function refresh(stateAndData) {
        const promises = Object.entries(stateAndData).map(([ searchKey, searchState ]) => {
            return Team.query(searchState.searchOptions).$promise.then(page => {
                stateAndData[searchKey].teamCount = page[0].totalCount;
                stateAndData[searchKey].pageInfo = page[0];
                $q.resolve(searchKey);
            })
        });
        return $q.all(promises);
    }

    function count(data) {
        return data.teamCount;
    }

    function hasNext(data) {
        if (data.pageInfo && data.pageInfo.links) {
            return data.pageInfo.links.next != null &&
                data.pageInfo.links.next !== "";
        }
        return false;
    }

    function next(data) {
        return move(data.pageInfo.links.next, data);
    }

    function hasPrevious(data) {
        if (data.pageInfo && data.pageInfo.links) {
            return data.pageInfo.links.prev != null &&
                data.pageInfo.links.prev !== "";
        }
        return false;
    }

    function previous(data) {
        return move(data.pageInfo.links.prev, data);
    }

    function move(start, data) {
        const searchOptions = { ...data.searchOptions, start };
        return $q.all({pageInfo: Team.query(searchOptions).$promise }).then(result => {
            data.pageInfo = result.pageInfo[0];
            return $q.resolve(data.pageInfo.items);
        });
    }

    function teams(data) {
        if (data.pageInfo && data.pageInfo.items) {
            return data.pageInfo.items;
        }
        return [];
    }

    function search(data, searchTerm) {
        if (data.pageInfo == null || data.pageInfo.items == null) {
            return $q.resolve([]);
        }
        const previousTerm = data.searchOptions.term;
        if (previousTerm == searchTerm) {
            // Search is being performed, no need to keep searching the same info over and over
            return $q.resolve(data.pageInfo.items);
        }
        // Perform the server side searching
        data.searchOptions.term = searchTerm;
        return $q.all({ pageInfo: Team.query(data.searchOptions).$promise }).then(result => {
            data.pageInfo = result.pageInfo[0];
            return data.pageInfo.items;
        });
    }
}