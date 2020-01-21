const webpack = require('webpack');

module.exports = {
  module: {
    rules: [{
      test: /\.html$/, loader: 'html-loader' 
    },{
      test: /\.(png|jpg|ico|gif|svg)$/,
      loader: 'file-loader?name=images/[name].[ext]'
    }]
  },
  plugins: [
    new webpack.ProvidePlugin({
      'window.jQuery': 'jquery',
      'jQuery': 'jquery'
    })
  ]
};