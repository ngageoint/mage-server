TODOs
=====

1. Migrate off of Bower.

- npm WARN deprecated bower@1.3.12: ..psst! While Bower is maintained, we recommend Yarn and Webpack for *new* front-end projects! Yarn's advantage is security and reliability, and Webpack's is support for both CommonJS and AMD projects. Currently there's no migration path, but please help to create it: https://github.com/bower/bower/issues/2467

2. Update dependencies.

- npm WARN deprecated minimatch@0.2.14: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
- npm WARN deprecated jade@0.26.3: Jade has been renamed to pug, please install the latest version of pug instead of jade
- npm WARN deprecated node-uuid@1.4.8: Use uuid module instead
- npm WARN deprecated graceful-fs@1.2.3: graceful-fs v3.0.0 and before will fail on node releases >= v7.0. Please update to graceful-fs@^4.0.0 as soon as possible. Use 'npm ls graceful-fs' to find it in the tree.
- npm WARN deprecated minimatch@2.0.10: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
- npm WARN deprecated graceful-fs@2.0.3: graceful-fs v3.0.0 and before will fail on node releases >= v7.0. Please update to graceful-fs@^4.0.0 as soon as possible. Use 'npm ls graceful-fs' to find it in the tree.
- npm WARN deprecated minimatch@1.0.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
- npm WARN deprecated tough-cookie@0.12.1: ReDoS vulnerability parsing Set-Cookie https://nodesecurity.io/advisories/130
- npm WARN deprecated minimatch@0.3.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
- npm WARN deprecated npmconf@2.1.2: this package has been reintegrated into npm and is now out of date with respect to npm

3. Migrate needs some love.

- the server/replset/mongos options are deprecated, all their options are supported at the top level of the options object [poolSize,ssl,sslValidate,sslCA,sslCert,sslKey,sslPass,sslCRL,autoReconnect,noDelay,keepAlive,connectTimeoutMS,family,socketTimeoutMS,reconnectTries,reconnectInterval,ha,haInterval,replicaSet,secondaryAcceptableLatencyMS,acceptableLatencyMS,connectWithNoPrimary,authSource,w,wtimeout,j,forceServerObjectId,serializeFunctions,ignoreUndefined,raw,promoteLongs,bufferMaxEntries,readPreference,pkFactory,promiseLibrary,readConcern,maxStalenessSeconds,loggerLevel,logger,promoteValues,promoteBuffers,promoteLongs,domainsEnabled,keepAliveInitialDelay,checkServerIdentity,validateOptions]
- the options [auth] is not supported

4.