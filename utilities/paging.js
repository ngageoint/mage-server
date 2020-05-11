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
  page(countQuery, query, options, callback, 'users');
}
function pageDevices(countQuery, query, options) {
  return page(countQuery, query, options, null, 'devices');
}

function page(countQuery, query, options, callback, dataKey) {
  //TODO probably should not call count so often
  countQuery.count(function (err, count) {
    if (err) return callback(err, null, null);

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
    query.sort(sort).limit(limit).skip(limit * page).exec(function (err, data) {
      if (err) return callback(err, data, null);

      let pageInfo = new PageInfo();
      pageInfo.start = start;
      pageInfo.limit = limit;
      pageInfo[dataKey] = data;
      pageInfo.size = data.size;

      let estimatedNext = start + limit;

      if (estimatedNext < count) {
        pageInfo.links.next = estimatedNext;
      }

      if (start > 0) {
        pageInfo.links.prev = Math.abs(options.start - options.limit);
      }

      if(callback) {
        callback(err, data, pageInfo);
      } else{
        return Promise.resolve(pageInfo);
      }
    });
  });
}

module.exports = {
  pageUsers,
  pageDevices
};