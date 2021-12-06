
module.exports = {
  spec: 'functionalTests-lib/**/*.js',
  ignore: 'functionalTests-lib/node_modules/**',
  require: [
    require.resolve('iconv-lite/encodings'),
    require.resolve('mock-fs'),
    require.resolve('./functionalTests/test_env')
  ],
};