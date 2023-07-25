const webpack = require('webpack');

module.exports = {
  module: {
    rules: [{ 
      parser: { system: false } 
    },{
      test: /\.html$/, loader: 'html-loader' 
    }]
  },
  plugins: [
  ]
};