var cfenv = require('cfenv')
  , appEnv = cfenv.getAppEnv();

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

environment.userBaseDirectory = 'mage/users';
environment.iconBaseDirectory = 'mage/icons';
environment.attachmentBaseDirectory = 'mage/attachments';

environment.tokenExpiration = 28800;

module.exports = environment;
