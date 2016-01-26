var util = require('util');

function transformLayers(layers, options) {
  return layers.map(function(layer) {
    return layer.toJSON({transform: true, path: options.path});
  });
}

exports.transform = function(layers, options) {
  options = options || {};

  return util.isArray(layers) ?
    transformLayers(layers, options) :
    layers.toJSON({transform: true, path: options.path});
};
