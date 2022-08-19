const mongodb = require('mongodb')
  , path = require('path')
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
  //TODO not sure this is supported anymore in mongoose 6.x
  x509Key = Buffer.from(x509Key); 
  x509Cert = Buffer.from(x509Cert);
  x509CaCert = Buffer.from(x509CaCert);
}
else if (x509KeyPath) {
  const fs = require('fs');
  x509Key = x509KeyPath; 
  if(fs.existsSync(x509CertPath)) {
    x509Cert = x509CertPath;
  }
  x509CaCert =x509CaCertPath;
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
            minPoolSize: parseInt(process.env.MAGE_MONGO_MIN_POOL_SIZE) || 5,
            maxPoolSize: parseInt(process.env.MAGE_MONGO_MAX_POOL_SIZE) || 5,
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
  appEnv.port = parseInt(process.env.MAGE_PORT || process.env.PORT) || 4242;
}

const mongoConfig = appEnv.getServiceCreds('MongoInstance');
const mongoSsl = String(mongoConfig.ssl).toLowerCase() in { "true": 0, "yes": 0, "enabled": 0 };

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
      replicaSet: mongoConfig.replicaSet,
      ssl: mongoSsl
    }
  }
};

const user = mongoConfig.user || mongoConfig.username;
const password = mongoConfig.pass || mongoConfig.password;
let tlsInsecure = false;
if (process.env.MAGE_MONGO_TLS_INSECURE) {
  tlsInsecure = String(process.env.MAGE_MONGO_TLS_INSECURE).toLowerCase() in { "true": true, "yes": true, "enabled": true };
}
if (mongoConfig.x509Key) {
  Object.assign(environment.mongo.options, {
    tlsCertificateKeyFile: mongoConfig.x509Key,
    tlsCertificateKeyFilePassword: password,
    tlsCertificateFile: mongoConfig.x509Cert,
    tlsCAFile: mongoConfig.x509CaCert,
    authSource: '$external',
    tls: true,
    authMechanism: mongodb.AuthMechanism.MONGODB_X509,
    // Using self-signed certs can cause issues.  If it does, set this to true.
    // https://mongoosejs.com/docs/migrating_to_5.html#strict-ssl-validation
    tlsInsecure: tlsInsecure
  });
}
else if (user && password) {
  Object.assign(environment.mongo.options, {
    //These user/pass propereties are needed for AWS mongo version 4.2.x
    user: user,
    pass: password,
    //This is how username and password should be passed
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
