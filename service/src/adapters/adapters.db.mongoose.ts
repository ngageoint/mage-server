import mongoose, { Mongoose } from 'mongoose'
import { EntityIdFactory } from '../entities/entities.global'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const log = require('winston')

class RetryConnection {

  readonly connectTimeout: number

  /**
   *
   * @param totalRetryTime the total number of milliseconds to retry connections before failing
   * @param retryInterval the number of milliseconds to wait between connection retries
   * @param resolve
   * @param reject
   */
  constructor(
    readonly mongoose: mongoose.Mongoose,
    readonly uri: string,
    totalRetryTime: number,
    readonly retryInterval: number,
    readonly options: mongoose.ConnectionOptions,
    readonly resolve: () => any,
    readonly reject: (err: any) => any) {
    this.connectTimeout = Date.now() + totalRetryTime;
  }

  attemptConnection(): Promise<mongoose.Mongoose> {
    log.debug(`attempting new mongodb connection to`, this.uri)
    return this.mongoose.connect(this.uri, this.options).then(this.resolve, this.onConnectionError.bind(this));
  }

  onConnectionError(err: any): void {
    log.error(`error connecting to mongodb database at ${this.uri}; please make sure mongodb is running: ${!!err ? err : 'unknown error'}`);
    if (Date.now() < this.connectTimeout) {
      log.info(`will retry connection in ${this.retryInterval / 1000} seconds`);
      setTimeout(this.attemptConnection.bind(this), this.retryInterval);
    }
    else {
      this.reject(`timed out after ${this.connectTimeout / 1000} seconds waiting for mongodb connection`);
    }
  }
}

export const waitForDefaultMongooseConnection = (mongoose: Mongoose, uri: string, retryTotalTime: number, retryInterval: number, options: mongoose.ConnectionOptions): Promise<void> => {
  log.debug(`wait for default mongoose connection:`, uri)
  if (mongoose.connection.readyState === mongoose.STATES.connected || mongoose.connection.readyState === mongoose.STATES.connecting) {
    log.debug(`already connected to`, uri)
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const retries = new RetryConnection(mongoose, uri, retryTotalTime, retryInterval, options, resolve, reject)
    retries.attemptConnection()
  })
}

export const MongoDbObjectIdFactory: EntityIdFactory = {
  async nextId(): Promise<string> {
    return mongoose.Types.ObjectId().toHexString()
  }
}