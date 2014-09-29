mongoPool = require('../src/mongo-pool')
testsCommon = require('./common')

describe 'Mongo Pool', ->

  it 'should use cache', (done) ->
    mongoPool.connect testsCommon.config, (err, db1) ->
      (not err?).should.be.ok
      (db1?).should.be.ok
      mongoPool.connect testsCommon.config, (err, db2) ->
        (not err?).should.be.ok
        (db2?).should.be.ok
        db2.should.be.equal db1
        done()

  it 'should allow skipping cache', (done) ->
    mongoPool.connect testsCommon.config, (err, db1) ->
      (not err?).should.be.ok
      (db1?).should.be.ok
      mongoPool.connect testsCommon.config, (err, db2) ->
        (not err?).should.be.ok
        (db2?).should.be.ok
        db2.should.not.be.equal db1
        done()
      , false
