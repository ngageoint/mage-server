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
          pageIndex: 0,
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
          pageIndex: 0,
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
          pageIndex: 0,
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
          pageIndex: 0,
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
      let backendParams = {
        pageSize: value.userFilter.limit,
        pageIndex: value.userFilter.page,
        active: value.userFilter.active,
        enabled: value.userFilter.enabled,
        term: value.searchFilter
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
      data.userFilter.term = data.searchFilter;
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
     data.userFilter.term = data.searchFilter;
     return move(data.userFilter, data);
   }
   return $q.resolve(data.pageInfo.items);
 }


  function move(filter, data) {
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

   switch (true) {
     case previousSearch === '' && userSearch === '':
       return performNoSearch(data);
     case previousSearch !== '' && userSearch === '':
       return clearSearch(data);
     case previousSearch === userSearch:
       return continueExistingSearch(data);
     default:
       return performNewSearch(data, userSearch);
   }
 }


  function performNoSearch(data) {
    return $q.resolve(data.pageInfo.items);
  }

  function clearSearch(data) {
    data.searchFilter = '';
    delete data.userFilter['or'];
    return UserService.getAllUsers(data.userFilter).then((pageInfo) => {
      data.pageInfo = pageInfo;
      return $q.resolve(data.pageInfo.items);
    });
  }

  function continueExistingSearch(data) {
    return $q.resolve(data.pageInfo.items);
  }

  function performNewSearch(data, userSearch) {
    data.searchFilter = userSearch;
    // Reset pageIndex to 0 for a new search
    data.userFilter.pageIndex = 0;
    const filter = { ...data.userFilter, term: userSearch };
    return UserService.getAllUsers(filter).then((pageInfo) => {
      data.pageInfo = pageInfo;
      return $q.resolve(pageInfo.items);
    });
  }
}
