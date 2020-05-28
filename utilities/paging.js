const User = require("../models/user.js");

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

function pageDevices(countQuery, query, options, conditions) {
  if (conditions) {
    return aggregateDevicesAndUsers(options, conditions);
  }
  return page(countQuery, query, options, 'devices');
}

function pageTeams(countQuery, query, options, callback) {
  page(countQuery, query, options, 'teams').then(pageInfo => {
    callback(null, pageInfo.teams, pageInfo);
  }).catch(err => {
    callback(err, null, null);
  });
}

function page(countQuery, query, options, dataKey) {
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
      return createPageInfo(data, dataKey, options, count);
    });
  });
}

function createPageInfo(data, dataKey, options, count) {
  const limit = Math.abs(options.limit) || 10;
  const start = (Math.abs(options.start) || 0);

  let pageInfo = new PageInfo();
  pageInfo.start = start;
  pageInfo.limit = limit;
  pageInfo[dataKey] = data;
  pageInfo.size = data.length;

  const estimatedNext = start + limit;

  if (estimatedNext < count) {
    pageInfo.links.next = estimatedNext;
  }

  if (start > 0) {
    pageInfo.links.prev = Math.abs(options.start - options.limit);
  }

  return Promise.resolve(pageInfo);
}

function aggregateDevicesAndUsers(options, conditions) {
  let aggregate = User.Model.aggregate([{$match:conditions}, {$lookup:{from:"devices",localField:"_id",foreignField:"userId",as:"devices"}}]);
  return aggregate.exec().then(data => {
    //TODO count
    var devices = [];
    data.forEach(function(record, index, array) {
      record.devices.forEach(function(device, idx, arr) {
        if(device.userId) {
          let miniUser = {
            _id: device.userId,
            displayName: record.displayName
          }
          delete device.userId;
          device.id = device._id;
          delete device._id;
          device.user = miniUser;
        }
        
        devices.push(device);
      });
    });
    
    return createPageInfo(devices, 'devices', options, devices.length);
  });
}

module.exports = {
  pageUsers,
  pageDevices,
  pageTeams
};