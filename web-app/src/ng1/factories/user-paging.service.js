module.exports = UserPagingService;

UserPagingService.$inject = ['UserService', '$q', 'UserReadService'];

function UserPagingService(UserService, $q) {

  return {
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

  function constructDefault() {
    return {
      all: {
        countFilter: {},
        userFilter: { limit: 10, sort: { displayName: 1, _id: 1 } },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      active: {
        countFilter: { active: true },
        userFilter: { limit: 10, sort: { displayName: 1, _id: 1 }, active: true },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      inactive: {
        countFilter: { active: false },
        userFilter: { limit: 10, sort: { displayName: 1, _id: 1 }, active: false },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      disabled: {
        countFilter: { enabled: false },
        userFilter: { limit: 10, sort: { displayName: 1, _id: 1 }, enabled: false },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      }
    }
  }

  function refresh(stateAndData) {

    const promises = [];

    for (const [key, value] of Object.entries(stateAndData)) {

      const promise = UserService.getAllUsers(value.userFilter).then(page => {
        stateAndData[key].userCount =  page.totalCount;
        stateAndData[key].pageInfo =  page;
        $q.resolve(key);
      });

      promises.push(promise);
    }

    return $q.all(promises);
  }

  function count(data) {
    return data.userCount;
  }

  function hasNext(data) {
    let status = false;

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
    let status = false;

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
    const filter = JSON.parse(JSON.stringify(data.userFilter));
    filter.start = start;
    return UserService.getAllUsers(filter).then(pageInfo => {
      data.pageInfo = pageInfo;
      return $q.resolve(pageInfo.items);
    });
  }

  function users(data) {
    let users = [];

    if (data.pageInfo && data.pageInfo.items) {
      users = data.pageInfo.items;
    }

    return users;
  }

  function search(data, userSearch) {
    // Basic validation
    if (!data.pageInfo || !data.pageInfo.items) {
      return $q.resolve([]);
    }

    // Map to UserSearchParams
    const params = {
      pageSize: data.pageInfo.pageSize,
      pageIndex: data.pageInfo.pageIndex,
      term: userSearch || null
    };

    // If there's no change in search, return cached items
    if (data.searchFilter === userSearch) {
      return $q.resolve(data.pageInfo.items);
    }

    // Update the current search term
    data.searchFilter = userSearch;

    // Request via UserReadService
    return UserReadService.search(params)
      .toPromise()
      .then((response) => {
        data.pageInfo = {
          pageSize: response.pageSize,
          pageIndex: response.pageIndex,
          totalCount: response.totalCount,
          next: response.next,
          prev: response.prev,
          items: response.items
        };
        return data.pageInfo.items;
      });
  }

}
