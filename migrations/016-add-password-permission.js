var mongoose = require('mongoose')
  , RoleModel = mongoose.model('Role');

exports.id = 'add-password-permission';

exports.up = function(done) {
  console.log('\nUpdating admin role to add user update password permisson...');

  RoleModel.update({name: 'ADMIN_ROLE'}, {$push : {permissions: 'UPDATE_USER_PASSWORD'}}, function(err) {
    done(err);
  });
};

exports.down = function(done) {
  RoleModel.update({name: 'ADMIN_ROLE'}, {$pull : {permissions: 'UPDATE_USER_PASSWORD'}}, function(err) {
    done(err);
  });
};
