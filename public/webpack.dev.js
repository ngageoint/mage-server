var merge = require('webpack-merge')
  , common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-module-source-map',
  module: {
    rules: [
      {
        test: /\.js?$/,
        use: ['source-map-loader'],
        enforce: 'pre'
      }
    ]
  },
  devServer: {
    contentBase: [ './dist' ],
    inline: true,
    port: 3000,
    proxy: [{
      context: ['/auth', '/api'],
      target: 'http://localhost:4242/',
    }]
  }
});
