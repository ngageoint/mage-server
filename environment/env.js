
const path = require('path');
const cfenv = require('cfenv');

if (!(process.env.MAGE_PORT || process.env.PORT || process.env.CF_INSTANCE_PORT || process.env.VCAP_APP_PORT)) {
  // bit of whitebox to cfenv lib here, because it provides no
  // way to override the port value in options at construction,
  // and uses the ports (https://www.npmjs.com/package/ports) package
  // to attempt to read or set a default port from a file based on 
  // the current app's name. this always ends up being 6001, and once
  // ports assigns that, it writes the value out to ~/.ports.json, 
  // which i think is undesirable behavior.
  process.env.MAGE_PORT = '4242';
}

const appEnv = cfenv.getAppEnv({
  vcap: {
    services: {
      "user-provided": [
        {
          name: 'MongoInstance',
          plan: 'unlimited',
          credentials: {
            url: process.env.MAGE_MONGO_URL || 'mongodb://127.0.0.1:27017/magedb',
            username: process.env.MAGE_MONGO_USER,
            password: process.env.MAGE_MONGO_PASSWORD,
            ssl: process.env.MAGE_MONGO_SSL,
            poolSize: parseInt(process.env.MAGE_MONGO_POOL_SIZE) || 5
          }
        }
      ]
    }
  }
});

if (appEnv.isLocal) {
  appEnv.port = parseInt(process.env.MAGE_PORT || process.env.PORT) || 4242;
}

const mongoConfig = appEnv.getServiceCreds('MongoInstance');
const mongoSsl = String(mongoConfig.ssl).toLowerCase() in { "true":0, "yes":0, "enabled":0 };

const environment = {
  address: process.env.MAGE_ADDRESS || '0.0.0.0',
  port: appEnv.port,
  userBaseDirectory: path.resolve(process.env.MAGE_USER_DIR || '/var/lib/mage/users'),
  iconBaseDirectory: path.resolve(process.env.MAGE_ICON_DIR || '/var/lib/mage/icons'),
  attachmentBaseDirectory: path.resolve(process.env.MAGE_ATTACHMENT_DIR || '/var/lib/mage/attachments'),
  tokenExpiration: parseInt(process.env.MAGE_TOKEN_EXPIRATION) || 28800,
  mongo: {
    uri: mongoConfig.url,
    connectTimeout: parseInt(process.env.MAGE_MONGO_CONN_TIMEOUT) * 1000 || 300000,
    connectRetryDelay: parseInt(process.env.MAGE_MONGO_CONN_RETRY_DELAY) * 1000 || 5000,
    options: {
      useMongoClient: true, // this can be removed after upgrading to mongoose 5+ http://mongoosejs.com/docs/connections.html#v5-changes
      poolSize: mongoConfig.poolSize,
      ssl: mongoSsl
    }
  }
};

const user = mongoConfig.user || mongoConfig.username;
const password = mongoConfig.password;
if (user && password) {
  environment.mongo.options.auth = {
    user: user, password: password
  }
}

/*
SSL configuration
Comment out as nessecary to setup ssl between MAGE application MongoDB server
Refer to the nodejs mongo driver docs for more information about these options
http://mongodb.github.io/node-mongodb-native/2.0/tutorials/enterprise_features/
You will also need to setup SSL on the mongodb side: https://docs.mongodb.com/v3.0/tutorial/configure-ssl/

2-way ssl configuration with x509 certificate

Object.assign(environment.mongo.options, {
  ssl: true,
  sslValidate: false,
  sslCA: fs.readFileSync('/etc/ssl/mongodb-cert.crt'),
  sslKey: fs.readFileSync('/etc/ssl/mongodb.pem'),
  sslCert: fs.readFileSync('/etc/ssl/mongodb-cert.crt'),
  auth: {
    user: '',
    authdb: '$external' ,
    authMechanism: 'MONGODB-X509'
  }
});
*/

module.exports = environment;