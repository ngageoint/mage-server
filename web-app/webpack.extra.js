const webpack = require('webpack');

module.exports = {
  module: {
    rules: [{ 
      parser: { system: false } 
    },{
      test: /\.html$/, loader: 'html-loader' 
    },{
      test: /\.(png|jpg|ico|gif|svg)$/,
      loader: 'file-loader?name=images/[name].[ext]'
    }]
  },
  plugins: [
  ]
};