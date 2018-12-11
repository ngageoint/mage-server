var merge = require('webpack-merge')
  , common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production'
});
