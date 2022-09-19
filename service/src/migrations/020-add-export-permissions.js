"use strict";

const log = require('winston');

exports.id = 'add-export-permissions';

exports.up = async function (done) {
  try {
    log.info('Adding export permissions (READ_EXPORT, DELETE_EXPORT)');
    const rolesCollection = await this.db.collection('roles');
    rolesCollection.updateOne({ name: 'ADMIN_ROLE' }, { $push: { permissions: { $each: ['READ_EXPORT', 'DELETE_EXPORT'] } } })
      .then(() => done())
      .catch(err => done(err));
  } catch (err) {
    log.warn('Failed adding export roles', err);
    done(err);
  }
};

exports.down = async function (done) {
  try {
    log.info('Removing export permissions (READ_EXPORT, DELETE_EXPORT)');
    const rolesCollection = await this.db.collection('roles');
    rolesCollection.updateOne({ name: 'ADMIN_ROLE' }, { $pull: { permissions: { $each: ['READ_EXPORT', 'DELETE_EXPORT'] } } })
      .then(() => done())
      .catch(err => done(err));
  } catch (err) {
    log.warn('Failed removing export roles', err);
    done(err);
  }
};
