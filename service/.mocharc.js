
module.exports = {
  extension: [ 'js', 'ts' ],
  recursive: true,
  require: [
    'ts-node/register',
    'iconv-lite/encodings',
    'mock-fs',
    './test/env.js',
  ],
};