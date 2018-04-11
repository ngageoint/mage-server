var webpack = require('webpack')
  , ExtractTextPlugin = require("extract-text-webpack-plugin")
  , CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  context: __dirname,
  entry: {
    app: './main.js',
    vendor: [
      'angular',
      'angular-animate',
      'angular-messages',
      'angular-resource',
      'angular-route',
      'angular-sanitize',
      'leaflet'
    ]
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: [{
          loader: 'css-loader',
          options: {
            minify: true,
            sourceMap: true
          }
        }]
      })
    },{
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader?name=fonts/[name].[ext]'
    },{
      test: /\.(png|jpg|ico)$/,
      loader: 'file-loader?name=images/[name].[ext]'
    },{
      test: /\.html$/, loader: 'raw-loader'
    }]
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], {
      exclude: ['index.html']
    }),
    new ExtractTextPlugin("styles.css"),
    new webpack.ProvidePlugin({
      'window.jQuery': 'jquery',
      "jQuery": "jquery"
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      file: 'vendor.bundle.js'
    })
  ]
};
