var mongoose = require('mongoose')
  , RoleModel = mongoose.model('Role');

exports.id = 'add-role-update-delete';

exports.up = function(done) {
  console.log('\nAdding update permission to ADMIN_ROLE ...');

  RoleModel.update({name: 'ADMIN_ROLE'}, {$push : {permissions: 'UPDATE_USER_ROLE'}}, function(err) {
    done(err);
  });
};

exports.down = function(done) {
  RoleModel.update({name: 'ADMIN_ROLE'}, {$pull : {permissions: 'UPDATE_USER_ROLE'}}, function(err) {
    done(err);
  });
};
