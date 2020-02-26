var mongoose = require('mongoose')
  , RoleModel = mongoose.model('Role');

exports.id = 'manager-role-add-user-create';

exports.up = function(done) {
  console.log('\nUpdating event manager role to add user create permisson...');

  RoleModel.update({name: 'EVENT_MANAGER_ROLE'}, {$push : {permissions: 'CREATE_USER'}}, function(err) {
    done(err);
  });
};

exports.down = function(done) {
  RoleModel.update({name: 'USER_ROLE'}, {$pull : {permissions: 'CREATE_USER'}}, function(err) {
    done(err);
  });
};
