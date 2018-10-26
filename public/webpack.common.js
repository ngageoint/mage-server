var webpack = require('webpack')
  , CleanWebpackPlugin = require('clean-webpack-plugin');

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

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
      use: [
        {
          loader: MiniCssExtractPlugin.loader,
          options: {}
        },
        'css-loader'
      ]
    },{
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader?name=fonts/[name].[ext]'
    },{
      test: /\.(png|jpg|ico|gif)$/,
      loader: 'file-loader?name=images/[name].[ext]'
    },{
      test: /\.html$/, loader: 'raw-loader'
    }]
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], {
      exclude: ['index.html']
    }),
    new MiniCssExtractPlugin({
      filename: "styles.css"
    }),
    new webpack.ProvidePlugin({
      'window.jQuery': 'jquery',
      "jQuery": "jquery"
    })
  ]
};
