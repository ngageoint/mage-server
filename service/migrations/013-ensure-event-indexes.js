'use strict';

const
log = require('winston'),
Event = require('../models/event').Model;

module.exports.id = "ensure-event-indexes";

module.exports.up = function(done) {
  // use this.db for MongoDB communication, and this.log() for logging
  this.db.collections()
  .then(collections => {
    return Promise.resolve(collections.find(c => c.collectionName == 'events'));
  }, done)
  .then(eventCollection => {
    if (eventCollection) {
      return eventCollection.indexes().then(indexes => {
        const formIdIndex = indexes.find(index => {
          const keys = Object.keys(index.key);
          return keys.length == 1 && keys[0] == 'forms._id';
        });
        return { eventCollection, formIdIndex };
      }, done);
    }
    else {
      return Promise.resolve({ eventCollection: null, formIdIndex: null });
    }
  }, done)
  .then(({ eventCollection, formIdIndex }) => {
    if (!eventCollection) {
      log.info("events collection does not yet exist so no index operations are necessary");
      return Promise.resolve();
    }
    if (formIdIndex) {
      if (formIdIndex.sparse && formIdIndex.unique) {
        log.info(`events collection already has a unique, sparse index ${formIdIndex.name} on forms._id so no index operations are necessary`);
        return Promise.resolve();
      }
      else {
        log.info(`dropping events collection forms._id index ${formIdIndex.name} and creating unique, sparse index ...`);
        return eventCollection.dropIndex(formIdIndex.name);
      }
    }
    log.info("events collection has no index on forms._id so no index operations are necessary");
    return Promise.resolve();
  }, done)
  .then(() => {
    return Event.ensureIndexes().then(done, done);
  }, done);
};

module.exports.down = function(done) {
  // use this.db for MongoDB communication, and this.log() for logging
  done();
};