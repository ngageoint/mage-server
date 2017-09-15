var mongoose = require('mongoose');

require('../models/user');
var UserModel = mongoose.model('User');

require('../models/role');
var RoleModel = mongoose.model('Role');

function createToken(userId, permissions) {
  var mockUser = new UserModel({
    _id: userId,
    username: 'test',
    active: true,
    roleId: new RoleModel({
      permissions: permissions
    })
  });

  var token = {
    _id: '1',
    token: '12345',
    deviceId: mongoose.Types.ObjectId(),
    userId: {
      populate: function(field, callback) {
        callback(null, mockUser);
      }
    }
  };

  return token;
}


module.exports = createToken;
