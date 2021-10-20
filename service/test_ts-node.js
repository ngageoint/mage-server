
// make sure ts-node uses the test project config
const project = require.resolve('./test/tsconfig.json')
const tsNode = require('ts-node');
tsNode.register({ project })