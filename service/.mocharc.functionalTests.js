
module.exports = {
  spec: 'functionalTests-lib/**/*.test.js',
  ignore: 'functionalTests-lib/node_modules/**',
  require: [
    require.resolve('iconv-lite/encodings'),
    require.resolve('mock-fs'),
    require.resolve('./functionalTests/test_env')
  ],
};