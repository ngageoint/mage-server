const mongoose = require('mongoose');
const RoleModel = mongoose.model('Role');

exports.id = 'add-read-system-info-permission';

exports.up = function(done) {
  this.log('adding READ_SYSTEM_INFO permission to ADMIN_ROLE ...');

  // Use $addToSet to ensure the permission is only added if it doesn't exist
  RoleModel.updateOne(
    { name: 'ADMIN_ROLE' },
    { $addToSet: { permissions: 'READ_SYSTEM_INFO' } },
    function(err) {
      done(err);
    }
  );
};

exports.down = function(done) {
  this.log('removing READ_SYSTEM_INFO permission from ADMIN_ROLE ...');

  RoleModel.updateOne(
    { name: 'ADMIN_ROLE' },
    { $pull: { permissions: 'READ_SYSTEM_INFO' } },
    function(err) {
      done(err);
    }
  );
};
