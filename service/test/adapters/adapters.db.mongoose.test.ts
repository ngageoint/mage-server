"use strict"

import chai, { expect } from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import mongoose, { Mongoose, MongooseThenable } from 'mongoose'
import { waitForDefaultMongooseConnection } from '../../lib/adapters/adapters.db.mongoose'

chai.use(sinonChai)

const mocks = sinon.createSandbox()

describe('waitForMongooseConnection', function() {

  const retryDelay = 2000
  const connectTimeout = 2 * 60 * 1000
  const mongooseInstance = new mongoose.Mongoose()
  const waitForConnection = () => {
    return waitForDefaultMongooseConnection(mongooseInstance, 'mongodb://test', connectTimeout, retryDelay, {})
  }

  type ConnectMethod = Mongoose['connect']
  let connectStub: sinon.SinonStub<Parameters<ConnectMethod>, ReturnType<ConnectMethod>>

  beforeEach(function() {
    connectStub = mocks.stub(mongoose, 'connect')
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
    connectStub.onSecondCall().resolves(mongoose)
    const connectTimeoutRejection = mocks.spy()

    return waitForConnection()
      .catch(connectTimeoutRejection)
      .then(() => {
        expect(connectStub).to.have.been.calledTwice
        expect(connectTimeoutRejection).not.to.have.been.called
      })

  }).timeout(retryDelay + 1)

  it('resolves when the connection succeeds', function() {

    connectStub.onFirstCall().resolves(mongoose)
    return waitForConnection()
  })

  it('rejects when the connection timeout passes', async function() {

    mocks.useFakeTimers()

    const firstConnect = Promise.reject<Mongoose>('first connect rejection')

    connectStub.onFirstCall().callsFake(function() {
      process.nextTick(function() {
        firstConnect.catch(function() {
          mocks.clock.tick(connectTimeout + 1)
        })
      })
      return firstConnect as unknown as MongooseThenable
    })
    const secondConnect = Promise.reject<MongooseThenable>()
    connectStub.onSecondCall().rejects(secondConnect)

    await waitForConnection().catch(function(err: Error) {
      expect(err).to.match(/^timed out/)
    })
  }).timeout(connectTimeout + 1)
})