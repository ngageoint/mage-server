
module.exports = {
  extension: [ 'js', 'ts' ],
  recursive: true,
  require: [
    require.resolve('ts-node/register'),
    require.resolve('iconv-lite/encodings'),
    require.resolve('mock-fs'),
    './test/env.js',
  ],
};