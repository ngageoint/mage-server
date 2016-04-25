var util = require('util');

var environment = {};

environment.port = process.env.PORT || 4242;
environment.address = process.env.ADDRESS || "0.0.0.0";

var mongoConfig = {
  // username: 'changeme',
  // password: 'changeme',
  scheme: 'mongodb',
  host: "localhost",
  port: 27017,
  db: "magedb",
  poolSize: 5
};

var credentials = (mongoConfig.username || mongoConfig.password) ?  util.format('%s:%s@', mongoConfig.username, mongoConfig.password) : '';
environment.mongo = {
  uri: mongoConfig.scheme + '://' + credentials + mongoConfig.host +  ':' + mongoConfig.port + '/' + mongoConfig.db,
  scheme: mongoConfig.scheme,
  host: mongoConfig.host,
  port: mongoConfig.port,
  db: mongoConfig.db,
  poolSize: mongoConfig.poolSize
};

environment.userBaseDirectory = '/Users/richard.becker/Dev/MAGE/Media/users';
environment.iconBaseDirectory = '/Users/richard.becker/Dev/MAGE/Media/icons';
environment.attachmentBaseDirectory = '/Users/richard.becker/Dev/MAGE/Media/attachments';

environment.tokenExpiration = 28800;

module.exports = environment;
