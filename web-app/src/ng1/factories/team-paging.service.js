module.exports = TeamPagingService;

TeamPagingService.$inject = ['Team', '$q'];

function TeamPagingService(Team, $q) {

    var service = {
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
}