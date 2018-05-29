const mongoose = require('mongoose'),
  env = require('../environment/env'),
  log = require('winston');

const mongo = env.mongo;
const connectRetryDelay = mongo.connectRetryDelay;

class RetryConnection {

  constructor(resolve, reject) {
    this.connectTimeout = Date.now() + mongo.connectTimeout;
    this.resolve = resolve;
    this.reject = reject;
  }

  attemptConnection() {
    mongoose.connect(mongo.uri, mongo.options).then(this.resolve, this.onConnectionError.bind(this));
  }

  onConnectionError(err) {
    log.error(`error connecting to mongodb database at ${mongo.uri}; please make sure mongodb is running: ${!!err ? err : 'unknown error'}`);
    if (Date.now() < this.connectTimeout) {
      log.info(`will retry connection in ${connectRetryDelay / 1000} seconds`);
      setTimeout(this.attemptConnection.bind(this), connectRetryDelay);
    }
    else {
      this.reject(`timed out after ${this.connectTimeout / 1000} seconds waiting for mongodb connection`);
    }
  }
}

const waitForMongooseConnection = () => {
  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    return Promise.resolve();
  }
  return new Promise(function(resolve, reject) {
    new RetryConnection(resolve, reject).attemptConnection();
  });
};

module.exports = waitForMongooseConnection;
