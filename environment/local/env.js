var environment = {};

environment.port = process.env.PORT || 4242;
environment.address = process.env.ADDRESS || "0.0.0.0";

var mongoConfig = {
  scheme: 'mongodb',
  host: "localhost",
  port: 27017,
  db: "magedb",
  poolSize: 5
};

environment.mongo = {
  uri: mongoConfig.scheme + '://' + mongoConfig.host +  ':' + mongoConfig.port + '/' + mongoConfig.db,
  scheme: mongoConfig.scheme,
  host: mongoConfig.host,
  port: mongoConfig.port,
  db: mongoConfig.db,
  poolSize: mongoConfig.poolSize
};

environment.userBaseDirectory = '/var/lib/mage/users';
environment.iconBaseDirectory = '/var/lib/mage/icons';
environment.attachmentBaseDirectory = '/var/lib/mage/attachments';

environment.tokenExpiration = 28800;

module.exports = environment;
