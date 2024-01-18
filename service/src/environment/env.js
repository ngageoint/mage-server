const path = require('path')
  , cfenv = require('cfenv');

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

let x509Key = process.env.MAGE_MONGO_X509_KEY;
let x509Cert = process.env.MAGE_MONGO_X509_CERT;
let x509CaCert = process.env.MAGE_MONGO_X509_CA_CERT;
const x509KeyPath = process.env.MAGE_MONGO_X509_KEY_FILE;
const x509CertPath = process.env.MAGE_MONGO_X509_CERT_FILE;
const x509CaCertPath = process.env.MAGE_MONGO_X509_CA_CERT_FILE;
if (x509Key) {
  x509Key = Buffer.from(x509Key);
  x509Cert = Buffer.from(x509Cert);
  x509CaCert = Buffer.from(x509CaCert);
}
else if (x509KeyPath) {
  const fs = require('fs');
  x509Key = fs.readFileSync(x509KeyPath);
  x509Cert = fs.readFileSync(x509CertPath);
  x509CaCert = fs.readFileSync(x509CaCertPath);
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
            poolSize: parseInt(process.env.MAGE_MONGO_POOL_SIZE) || 5,
            replicaSet: process.env.MAGE_MONGO_REPLICA_SET,
            username: process.env.MAGE_MONGO_USER,
            password: process.env.MAGE_MONGO_PASSWORD,
            ssl: process.env.MAGE_MONGO_SSL,
            x509Key: x509Key || null,
            x509Cert: x509Cert || null,
            x509CaCert: x509CaCert || null
          }
        }
      ]
    }
  }
});

if (appEnv.isLocal) {
  appEnv.port = [ process.env.MAGE_PORT, process.env.PORT, 4242 ].map(parseInt).find(x => typeof x === 'number' && !isNaN(x));
}

const mongoConfig = appEnv.getServiceCreds('MongoInstance');
const mongoSsl = String(mongoConfig.ssl).toLowerCase() in { "true":0, "yes":0, "enabled":0 };

const environment = {
  address: process.env.MAGE_ADDRESS || '0.0.0.0',
  port: appEnv.port,
  userBaseDirectory: path.resolve(process.env.MAGE_USER_DIR || '/var/lib/mage/users'),
  iconBaseDirectory: path.resolve(process.env.MAGE_ICON_DIR || '/var/lib/mage/icons'),
  attachmentBaseDirectory: path.resolve(process.env.MAGE_ATTACHMENT_DIR || '/var/lib/mage/attachments'),
  layerBaseDirectory: path.resolve(process.env.MAGE_LAYER_DIR || '/var/lib/mage/layers'),
  tempDirectory: path.resolve(process.env.MAGE_TEMP_DIR || '/tmp'),
  exportDirectory: path.resolve(process.env.MAGE_EXPORT_DIR || '/var/lib/mage/export'),
  securityDirectory: path.resolve(process.env.MAGE_SECURITY_DIR || '/var/lib/mage/security'),
  exportSweepInterval: parseInt(process.env.MAGE_EXPORT_SWEEP_INTERVAL) || 28800,
  exportTtl: parseInt(process.env.MAGE_EXPORT_TTL) || 259200,
  tokenExpiration: parseInt(process.env.MAGE_TOKEN_EXPIRATION) || 28800,
  cookies: {
    secure: process.env.MAGE_SESSION_COOKIE_SECURE !== 'false'
  },
  mongo: {
    uri: mongoConfig.url,
    connectTimeout: parseInt(process.env.MAGE_MONGO_CONN_TIMEOUT) * 1000 || 300000,
    connectRetryDelay: parseInt(process.env.MAGE_MONGO_CONN_RETRY_DELAY) * 1000 || 5000,
    options: {
      useMongoClient: true, // this can be removed after upgrading to mongoose 5+ http://mongoosejs.com/docs/connections.html#v5-changes
      poolSize: mongoConfig.poolSize,
      replicaSet: mongoConfig.replicaSet,
      ssl: mongoSsl
    }
  }
};

const user = mongoConfig.user || mongoConfig.username;
const password = mongoConfig.password;
if (mongoConfig.x509Key) {
  Object.assign(environment.mongo.options, {
    sslKey: mongoConfig.x509Key,
    sslPass: password,
    sslCert: mongoConfig.x509Cert,
    sslCA: mongoConfig.x509CaCert,
    authSource: '$external',
    ssl: true,
    checkServerIdentity: false,
    auth: { authMechanism: 'MONGODB-X509' }
  });
}
else if (user && password) {
  environment.mongo.options.auth = {
    user: user, password: password
  };
}

module.exports = environment;
