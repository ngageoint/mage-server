"use strict"

import chai, { expect } from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import mongoose, { Mongoose, MongooseThenable } from 'mongoose'
import { waitForDefaultMongooseConnection } from '../../lib/adapters/adapters.db.mongoose'

chai.use(sinonChai)

const mocks = sinon.createSandbox()

describe('wait for mongoose connection utility', function() {

  const retryDelay = 2000
  const connectTimeout = 2 * 60 * 1000
  const mongooseInstance = new mongoose.Mongoose()
  const waitForConnection = () => {
    return waitForDefaultMongooseConnection(mongooseInstance, 'mongodb://test', connectTimeout, retryDelay, {})
  }

  type ConnectMethod = Mongoose['connect']
  let connectStub: sinon.SinonStub<Parameters<ConnectMethod>, ReturnType<ConnectMethod>>

  beforeEach(function() {
    connectStub = mocks.stub(mongooseInstance, 'connect')
  })

  afterEach(function() {
    mocks.restore()
  })

  it('retries after delay when first connection fails', function() {

    mocks.useFakeTimers()

    const firstConnect = Promise.reject<Mongoose>('first connect rejection')
    connectStub.onFirstCall().callsFake(function(): any {
      process.nextTick(function() {
        firstConnect.catch(function() {
          mocks.clock.tick(retryDelay + 1)
        })
      })
      return firstConnect
    })
    connectStub.onSecondCall().resolves(mongooseInstance)
    const connectTimeoutRejection = mocks.spy()

    return waitForConnection()
      .catch(connectTimeoutRejection)
      .then(() => {
        expect(connectStub).to.have.been.calledTwice
        expect(connectTimeoutRejection).not.to.have.been.called
      })

  }).timeout(retryDelay + 1)

  it('resolves when the connection succeeds', function() {

    connectStub.onFirstCall().resolves(mongooseInstance)
    return waitForConnection()
  })

  it('rejects when the connection timeout passes', async function() {

    mocks.useFakeTimers()
    connectStub.onFirstCall().callsFake(function() {
      process.nextTick(function() {
        mocks.clock.tick(connectTimeout + 1)
      })
      return new Promise<Mongoose>((resolve, reject) => {
        reject('first connect rejection')
      }) as unknown as MongooseThenable
    })
    connectStub.onSecondCall().rejects('second connect rejection')

    await waitForConnection().catch(function(err: Error) {
      expect(err).to.match(/^timed out/)
    })
  }).timeout(connectTimeout + 1)
})