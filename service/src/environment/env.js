const mongodb = require('mongodb')
  , path = require('path')
  , cfenv = require('cfenv')
  , log = require('winston');

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
  if (fs.existsSync(x509CertPath)) {
    x509Cert = fs.readFileSync(x509CertPath);
  }
  x509CaCert = fs.readFileSync(x509CaCertPath);
}

//DEPRECATED: Remove in next release.
if (process.env.MAGE_MONGO_POOL_SIZE) {
  log.warn('[DEPRECATED] The env variable MAGE_MONGO_POOL_SIZE is DEPRECATED. Please use MAGE_MONGO_MIN_POOL_SIZE and MAGE_MONGO_MAX_POOL_SIZE instead.');
}

let minMongoPoolSize = 5;
if (process.env.MAGE_MONGO_MIN_POOL_SIZE) {
  minMongoPoolSize = parseInt(process.env.MAGE_MONGO_MIN_POOL_SIZE);
} else if (process.env.MAGE_MONGO_POOL_SIZE) {
  //DEPRECATED: Remove in next release.
  minMongoPoolSize = parseInt(process.env.MAGE_MONGO_POOL_SIZE);
}

let maxMongoPoolSize = 5;
if (process.env.MAGE_MONGO_MAX_POOL_SIZE) {
  maxMongoPoolSize = parseInt(process.env.MAGE_MONGO_MAX_POOL_SIZE);
} else if (process.env.MAGE_MONGO_POOL_SIZE) {
  //DEPRECATED: Remove in next release.
  maxMongoPoolSize = parseInt(process.env.MAGE_MONGO_POOL_SIZE);
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
            minPoolSize: minMongoPoolSize,
            maxPoolSize: maxMongoPoolSize,
            replicaSet: process.env.MAGE_MONGO_REPLICA_SET,
            username: process.env.MAGE_MONGO_USER,
            password: process.env.MAGE_MONGO_PASSWORD,
            tls: process.env.MAGE_MONGO_SSL || null,
            x509Key: x509Key || null,
            x509Cert: x509Cert || null,
            x509CaCert: x509CaCert || null,
            tlsInsecure: process.env.MAGE_MONGO_TLS_INSECURE || null
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
      minPoolSize: mongoConfig.minPoolSize,
      maxPoolSize: mongoConfig.maxPoolSize,
      replicaSet: mongoConfig.replicaSet
    }
  }
};

const user = mongoConfig.user || mongoConfig.username;
const password = mongoConfig.pass || mongoConfig.password;

if (mongoConfig.x509Key) {
  const mongoTls = String(mongoConfig.tls).toLowerCase() in { "true": 0, "yes": 0, "enabled": 0 };
  const tlsInsecure = String(mongoConfig.tlsInsecure).toLowerCase() in { "true": 0, "yes": 0, "enabled": 0 };

  Object.assign(environment.mongo.options, {
    tls: mongoTls,
    key: mongoConfig.x509Key,
    passphrase: password,
    cert: mongoConfig.x509Cert,
    ca: mongoConfig.x509CaCert,
    authSource: '$external',
    authMechanism: mongodb.AuthMechanism.MONGODB_X509,
    tlsInsecure: tlsInsecure
  });
}
else if (user && password) {
  Object.assign(environment.mongo.options, {
    auth: {
      username: user,
      password: password
    },
    authSource: process.env.MAGE_MONGO_CRED_DB_NAME || 'admin',
    //TODO we need to move to at least SHA256
    authMechanism: mongodb.AuthMechanism.MONGODB_SCRAM_SHA1,
  });
}

module.exports = environment;
