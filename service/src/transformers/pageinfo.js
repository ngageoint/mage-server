
exports.transform = function(pageInfo, req) {
    pageInfo.links.base = req.getRoot();
    pageInfo.links.self = req.getPath();
    return pageInfo;
  };