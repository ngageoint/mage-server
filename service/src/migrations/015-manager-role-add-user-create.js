const mongoose = require('mongoose')
  , RoleModel = mongoose.model('Role');

exports.id = 'manager-role-add-user-create';

exports.up = function(done) {
  this.log('updating event manager role to add user create permisson...');

  RoleModel.updateOne({name: 'EVENT_MANAGER_ROLE'}, {$push : {permissions: 'CREATE_USER'}}, function(err) {
    done(err);
  });
};

exports.down = function(done) {
  RoleModel.updateOne({name: 'USER_ROLE'}, {$pull : {permissions: 'CREATE_USER'}}, function(err) {
    done(err);
  });
};
