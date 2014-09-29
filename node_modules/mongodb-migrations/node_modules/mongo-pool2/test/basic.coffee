mongoPool = require('../src/mongo-pool')
testsCommon = require('./common')

describe 'Mongo Pool', ->

  it 'should connect to DB', (done) ->
    mongoPool.connect testsCommon.config, (err, db) ->
      (not err?).should.be.ok
      (db?).should.be.ok
      db._state.should.be.equal 'connected'
      done()

  it 'should create pool', (done) ->
    mongoPool.create testsCommon.config, (err, pool) ->
      (not err?).should.be.ok
      (pool?).should.be.ok
      for i in [0...10]
        (pool.acquire()?).should.be.ok
      done()
