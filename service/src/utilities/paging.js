
class PageInfo {
  constructor() {
    this.links = {
      base: '',
      context: '',
      next: null,
      prev: null,
      self: ''
    };
    this.limit = 0;
    this.size = 0;
    this.start = 0;
  }
}

function page(count, query, options, dataKey, dataConverter) {
  const sort = {};
  if (options.sort) {
    const json = JSON.parse(options.sort);

    for (const [key, value] of Object.entries(json)) {
      sort[key] = value;
    }
  }

  const limit = Math.abs(options.limit) || 10;
  const start = (Math.abs(options.start) || 0);
  const page = Math.ceil(start / limit);

  return query.sort(sort).limit(limit).skip(limit * page).exec().then(data => {
    if (dataConverter) {
      data = dataConverter(data);
    }
    const pageInfo = new PageInfo();
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
  });
}

function countAndPage(countQuery, query, options, dataKey) {
  return countQuery.count().then(count => {
    return page(count, query, options, dataKey, null);
  });
}

module.exports = {
  page,
  countAndPage,
  PageInfo
};
