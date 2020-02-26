var mongoose = require('mongoose')
  , RoleModel = mongoose.model('Role');

exports.id = 'user-role-remove-delete';

exports.up = function(done) {
  console.log('\nUpdating user role to remove delete permisson...');

  RoleModel.update({name: 'USER_ROLE'}, {$pull : {permissions: 'DELETE_OBSERVATION'}}, function(err) {
    done(err);
  });
};

exports.down = function(done) {
  RoleModel.update({name: 'USER_ROLE'}, {$push : {permissions: 'DELETE_OBSERVATION'}}, function(err) {
    done(err);
  });
};
