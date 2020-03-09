exports.generateCName = function(value) {
  return value
    .replace(/[^\w\.-_]+/g, '_')
    .replace(/^(\d+)/, '_$1');
};
