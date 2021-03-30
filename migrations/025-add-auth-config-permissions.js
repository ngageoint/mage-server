"use strict";

const log = require('winston');

exports.id = 'add-auth-config-permissions';

exports.up = function (done) {
    try {
        log.info('Adding auth config permissions (READ_AUTH_CONFIG, UPDATE_AUTH_CONFIG)');
        this.db.collection('roles', { strict: true }, function (err, rolesCollection) {
            if (err) return done(err);

            rolesCollection.updateOne({ name: 'ADMIN_ROLE' }, { $push: { permissions: { $each: ['READ_AUTH_CONFIG', 'UPDATE_AUTH_CONFIG'] } } }).then(() => done()).catch(err => done(err));
        });
    } catch (err) {
        log.warn('Failed adding auth config roles', err);
        done(err);
    }
};

exports.down = function (done) {
    try {
        log.info('Removing auth config permissions (READ_AUTH_CONFIG, UPDATE_AUTH_CONFIG)');
        this.db.collection('roles', { strict: true }, function (err, rolesCollection) {
            if (err) return done(err);

            rolesCollection.updateOne({ name: 'ADMIN_ROLE' }, { $pull: { permissions: { $each: ['READ_AUTH_CONFIG', 'UPDATE_AUTH_CONFIG'] } } }).then(() => done()).catch(err => done(err));
        });
    } catch (err) {
        log.warn('Failed removing auth config roles', err);
        done(err);
    }
};
