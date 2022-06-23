
exports.transform = function (page, req, pstart, plimit) {

  let oldPageInfo = page;

  //Convert new page info into old page info (new page info will not have links)
  if (!page.links) {
    oldPageInfo = {
      ...page,
      links: {
        base: '',
        context: '',
        next: null,
        prev: null,
        self: ''
      }
    }

    const limit = Math.abs(plimit) || 10;
    const start = (Math.abs(pstart) || 0);

    const estimatedNext = start + limit;

    if (estimatedNext < page.totalCount) {
      oldPageInfo.links.next = estimatedNext;
    }

    if (start > 0) {
      oldPageInfo.links.prev = Math.abs(start - limit);
    }
  }

  oldPageInfo.links.base = req.getRoot();
  oldPageInfo.links.self = req.getPath();
  return oldPageInfo;
};