function transformExports(exports, options) {
  return exports.map(function(transform) {
    return transform.toJSON({transform: true, path: options.path});
  });
}

exports.transform = function(exports, options) {
  options = options || {};

  return Array.isArray(exports) ?
    transformExports(exports, options) :
    exports.toJSON({transform: true, path: options.path});
};
