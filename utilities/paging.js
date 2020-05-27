class PageInfo {
  constructor() {
    this.links = {
      base: '',
      context: '',
      next: '',
      prev: '',
      self: ''
    };
    this.limit = 0;
    this.size = 0;
    this.start = 0;
  }
}

function pageUsers(countQuery, query, options, callback) {
  page(countQuery, query, options, 'users').then(pageInfo => {
    callback(null, pageInfo.users, pageInfo);
  }).catch(err => {
    callback(err, null, null);
  });
}

function pageDevices(countQuery, query, options, searchUsers) {
  if(searchUsers) {
    return page(countQuery, query, options, 'devices', deviceFilter);
  }
  return page(countQuery, query, options, 'devices');
}

function deviceFilter(data) {
  var filteredData = [];

  for (var i = 0; i < data.length; i++) {
    let record = data[i];
    if (record.userId != null) {
      filteredData.push(record);
    }
  }

  return filteredData;
}

function pageTeams(countQuery, query, options, callback) {
  page(countQuery, query, options, 'teams').then(pageInfo => {
    callback(null, pageInfo.teams, pageInfo);
  }).catch(err => {
    callback(err, null, null);
  });
}

function page(countQuery, query, options, dataKey, filterFunction) {
  return countQuery.count().then(count => {
    var sort = [['_id', 1]];
    if (options.sort) {
      let json = JSON.parse(options.sort);
      sort = [];

      for (let [key, value] of Object.entries(json)) {
        let item = [key, value];
        sort.push(item);
      }
    }

    var limit = Math.abs(options.limit) || 10;
    var start = (Math.abs(options.start) || 0);
    var page = Math.ceil(start / limit);

    return query.sort(sort).limit(limit).skip(limit * page).exec().then(data => {

      var filteredData = data;
      if (filterFunction) {
        filteredData = filterFunction(data);
      }

      let pageInfo = new PageInfo();
      pageInfo.start = start;
      pageInfo.limit = limit;
      pageInfo[dataKey] = filteredData;
      pageInfo.size = filteredData.size;

      let estimatedNext = start + limit;

      if (estimatedNext < count) {
        pageInfo.links.next = estimatedNext;
      }

      if (start > 0) {
        pageInfo.links.prev = Math.abs(options.start - options.limit);
      }

      return Promise.resolve(pageInfo);
    });
  });
}

module.exports = {
  pageUsers,
  pageDevices,
  pageTeams
};