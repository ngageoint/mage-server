const webpack = require('webpack'),
  CleanWebpackPlugin = require('clean-webpack-plugin'),
  MiniCssExtractPlugin = require("mini-css-extract-plugin"),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  postcssCustomProperties = require('postcss-custom-properties');

module.exports = {
  context: __dirname,
  entry: {
    app: './main.js',
    api_docs: './api_docs/index.js'
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    },{
      test: /\.(css|scss)$/,
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            sourceMap: true
          }
        },
        {
          loader: 'sass-loader',
          options: {
            sourceMap: true,
            includePaths: ['./css', './node_modules']
          }
        },
        {
          loader: 'postcss-loader',
          options: {
            sourceMap: true,
            plugins: () => [
              postcssCustomProperties({
                importFrom: ['./css/variables.css']
              })
            ]
          }
        }
      ]
    },{
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader?name=fonts/[name].[ext]'
    },{
      test: /\.(png|jpg|ico|gif|svg)$/,
      loader: 'file-loader?name=images/[name].[ext]'
    },{
      test: /\.html$/, loader: 'raw-loader'
    }]
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
    new CleanWebpackPlugin(
      ['dist']
    ),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
      excludeChunks: [ 'api_docs' ]
    }),
    new HtmlWebpackPlugin({
      filename: 'api_docs/index.html',
      template: './api_docs/index.html',
      excludeChunks: [ 'app' ]
    }),
    new webpack.ProvidePlugin({
      'window.jQuery': 'jquery',
      'jQuery': 'jquery'
    })
  ]
};
