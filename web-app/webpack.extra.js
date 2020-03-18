const webpack = require('webpack');

module.exports = {
  module: {
    rules: [{
      test: /\.html$/, loader: 'html-loader' 
    }]
  },
  plugins: [
  ]
};