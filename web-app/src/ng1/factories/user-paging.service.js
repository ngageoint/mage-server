module.exports = UserPagingService;

UserPagingService.$inject = ['UserService', '$q'];

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
        userFilter: {
          pageSize: 10,
          pageIndex: 1,
          sort: { displayName: 1, _id: 1 }
        },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      active: {
        countFilter: { active: true },
        userFilter: {
          pageSize: 10,
          pageIndex: 1,
          sort: { displayName: 1, _id: 1 },
          active: true
        },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      inactive: {
        countFilter: { active: false },
        userFilter: {
          pageSize: 10,
          pageIndex: 1,
          sort: { displayName: 1, _id: 1 },
          active: false
        },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      disabled: {
        countFilter: { enabled: false },
        userFilter: {
          pageSize: 10,
          pageIndex: 1,
          sort: { displayName: 1, _id: 1 },
          enabled: false
        },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      }
    };
  }

  function refresh(stateAndData) {
    const promises = [];
    for (const [key, value] of Object.entries(stateAndData)) {
      // Map frontend parameters to backend expected parameters
      let backendParams = {
        pageSize: value.userFilter.limit,
        pageIndex: value.userFilter.page, // Assuming 'page' exists in userFilter
        active: value.userFilter.active,
        enabled: value.userFilter.enabled,
        term: value.searchFilter // Assuming searchFilter is the search term
      };

      const promise = UserService.getAllUsers(backendParams).then((page) => {
        stateAndData[key].userCount = page.totalCount;
        stateAndData[key].pageInfo = page;
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
    return (
      data.pageInfo && data.pageInfo.links && data.pageInfo.links.next !== null
    );
  }

  function next(data) {
    if (hasNext(data)) {
      data.userFilter.pageIndex = data.pageInfo.links.next;
      return move(data.userFilter, data);
    }
    return $q.resolve(data.pageInfo.items);
  }

  function hasPrevious(data) {
    return (
      data.pageInfo && data.pageInfo.links && data.pageInfo.links.prev !== null
    );
  }


  function previous(data) {
    if (hasPrevious(data)) {
      data.userFilter.pageIndex = data.pageInfo.links.prev;
      return move(data.userFilter, data);
    }
    // Return the current items without clearing them
    return $q.resolve(data.pageInfo.items);
  }

  function move(start, data) {
    const filter = JSON.parse(JSON.stringify(data.userFilter));

    return UserService.getAllUsers(filter).then((pageInfo) => {
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
    const previousSearch = data.searchFilter;

    if (previousSearch === '' && userSearch === '') {
      return performNoSearch(data);
    } else if (previousSearch !== '' && userSearch === '') {
      return clearSearch(data);
    } else if (previousSearch === userSearch) {
      return continueExistingSearch(data);
    } else {
      return performNewSearch(data, userSearch);
    }
  }

  function performNoSearch(data) {
    // Logic for not performing a search
    return $q.resolve(data.pageInfo.items);
  }

  function clearSearch(data) {
    // Logic for clearing out the search
    data.searchFilter = '';
    delete data.userFilter['or'];
    return UserService.getAllUsers(data.userFilter).then((pageInfo) => {
      data.pageInfo = pageInfo;
      return $q.resolve(data.pageInfo.items);
    });
  }

  function continueExistingSearch(data) {
    // Logic for continuing an existing search
    return $q.resolve(data.pageInfo.items);
  }

  function performNewSearch(data, userSearch) {
    // Logic for performing a new search
    data.searchFilter = userSearch;

    const filter = { ...data.userFilter };
    filter.term = userSearch;

    return UserService.getAllUsers(filter).then((pageInfo) => {
      data.pageInfo = pageInfo;
      return $q.resolve(data.pageInfo.items);
    });
  }
}
