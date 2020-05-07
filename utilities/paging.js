var User = require('../models/user')

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

function pageUsers(query, options, callback) {
  //TODO probably should not call count so often
  User.count(query, function (err, count) {
    if (err) return callback(err, null, null);

    var sort = [['displayName', 1], ['_id', 1]];
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
    query.sort(sort).limit(limit).skip(limit * page).exec(function (err, users) {
      if (err) return callback(err, users, null);

      let pageInfo = new PageInfo();
      pageInfo.start = start;
      pageInfo.limit = limit;
      pageInfo.users = users;
      pageInfo.size = users.size;

      let estimatedNext = start + limit;

      if (estimatedNext < count) {
        pageInfo.links.next = estimatedNext;
      }

      if (start > 0) {
        pageInfo.links.prev = Math.abs(options.start - options.limit);
      }

      callback(err, users, pageInfo);
    });
  });
}

module.exports = {
  pageUsers
};