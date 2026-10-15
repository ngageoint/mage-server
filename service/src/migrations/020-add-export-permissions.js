"use strict";

exports.id = 'add-export-permissions';

exports.up = async function (done) {
  try {
    this.log('Adding export permissions (READ_EXPORT, DELETE_EXPORT)');
    const rolesCollection = await this.db.collection('roles');
    rolesCollection.updateOne({ name: 'ADMIN_ROLE' }, { $push: { permissions: { $each: ['READ_EXPORT', 'DELETE_EXPORT'] } } })
      .then(() => done())
      .catch(err => done(err));
  } catch (err) {
    this.log('Failed adding export roles', err);
    done(err);
  }
};

exports.down = async function (done) {
  try {
    this.log('Removing export permissions (READ_EXPORT, DELETE_EXPORT)');
    const rolesCollection = await this.db.collection('roles');
    rolesCollection.updateOne({ name: 'ADMIN_ROLE' }, { $pull: { permissions: { $each: ['READ_EXPORT', 'DELETE_EXPORT'] } } })
      .then(() => done())
      .catch(err => done(err));
  } catch (err) {
    this.log('Failed removing export roles', err);
    done(err);
  }
};
