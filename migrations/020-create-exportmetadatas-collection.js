"use strict";

const log = require('winston')
    , exportTtl = require('../environment/env').exportTtl;

exports.id = 'create-exportmetadatas-collection';

exports.up = function (done) {
    log.info('Creating export metadata collection');

    this.db.createCollection('exportmetadatas', { strict: true }).then(collection => {
        log.info('Creating index on the export metadata collection');
        return collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: exportTtl });
    }).then(() => {
        return done();
    }).catch(err => {
        log.warn('Failed creating export metadata collection', err);
        done(err);
    });
};

exports.down = function (done) {
    done();
};