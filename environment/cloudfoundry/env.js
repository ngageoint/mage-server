var cfenv = require('cfenv')
  , appEnv = cfenv.getAppEnv()
  , path = require('path');

var environment = {};

environment.port = appEnv.port;
environment.address = appEnv.bind;

var mongoConfig = appEnv.getServiceCreds('MongoInstance');
environment.mongo = {
  uri: mongoConfig.uri,
  scheme: mongoConfig.scheme,
  host: mongoConfig.host,
  port: mongoConfig.port,
  db: mongoConfig.database,
  username: mongoConfig.username,
  password: mongoConfig.password,
  poolSize: mongoConfig.poolSize
};

environment.mongoInstance = mongoConfig;

environment.userBaseDirectory = path.resolve('mage/users');
environment.iconBaseDirectory = path.resolve('mage/icons');
environment.attachmentBaseDirectory = path.resolve('mage/attachments');

environment.tokenExpiration = 28800;

module.exports = environment;
