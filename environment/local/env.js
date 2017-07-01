var util = require('util');

var environment = {};

environment.port = process.env.PORT || 4242;
environment.address = process.env.ADDRESS || "0.0.0.0";

var mongoConfig = {
  // username: 'changeme',
  // password: 'changeme',
  ssl: false,
  scheme: 'mongodb',
  host: process.env.MONGO_HOST || "localhost",
  port: process.env.MONGO_PORT || "27017",
  db: "magedb",
  poolSize: 5
};

var credentials = (mongoConfig.username || mongoConfig.password) ?  util.format('%s:%s@', mongoConfig.username, mongoConfig.password) : '';
environment.mongo = {
  uri: mongoConfig.scheme + '://' + credentials + mongoConfig.host +  ':' + mongoConfig.port + '/' + mongoConfig.db + "?" + util.format('ssl=%s', mongoConfig.ssl),
  scheme: mongoConfig.scheme,
  host: mongoConfig.host,
  port: mongoConfig.port,
  db: mongoConfig.db,
  ssl: mongoConfig.ssl,
  poolSize: mongoConfig.poolSize
};

var serverOptions = {
  poolSize: mongoConfig.poolSize
};

// SSL configuration
// Comment out as nessecary to setup ssl between MAGE application MongoDB server
// Refer to the nodejs mongo driver docs for more information about these options
// http://mongodb.github.io/node-mongodb-native/2.0/tutorials/enterprise_features/
// You will also need to setup SSL on the mongodb side: https://docs.mongodb.com/v3.0/tutorial/configure-ssl/

// 2-way ssl configuration with x509 certificate
// environment.mongo.options = {
//   server: serverOptions,
//   user: '',
//   auth: {
//      authdb: '$external' ,
//      authMechanism: 'MONGODB-X509'
//    }
// };

// serverOptions.ssl = true;
// serverOptions.sslValidate = false;
// serverOptions.sslCA = fs.readFileSync('/etc/ssl/mongodb-cert.crt');
// serverOptions.sslKey = fs.readFileSync('/etc/ssl/mongodb.pem');
// serverOptions.sslCert = fs.readFileSync('/etc/ssl/mongodb-cert.crt');

environment.mongo.options = {
  server: serverOptions
};

environment.userBaseDirectory = '/var/lib/mage/users';
environment.iconBaseDirectory = '/var/lib/mage/icons';
environment.attachmentBaseDirectory = '/var/lib/mage/attachments';

environment.tokenExpiration = 28800;

module.exports = environment;
