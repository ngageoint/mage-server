
module.exports = {
  spec: 'test-lib/**/*.js',
  ignore: 'test-lib/node_modules/**',
  timeout: 10000,
  require: [
    require.resolve('iconv-lite/encodings'),
    require.resolve('mock-fs'),
    require.resolve('./test/test_env'),
  ],
};