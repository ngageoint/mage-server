
module.exports = {
  extension: [ 'js', 'ts' ],
  recursive: true,
  require: [
    './node_modules/ts-node/register',
    './node_modules/iconv-lite/encodings',
    './node_modules/mock-fs',
    './test/env.js',
  ],
};