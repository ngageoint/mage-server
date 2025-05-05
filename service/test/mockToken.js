const mongoose = require('mongoose');

require('../lib/models/user');
const UserModel = mongoose.model('User');

require('../lib/models/role');
const RoleModel = mongoose.model('Role');

function createToken(userId, permissions) {
  const mockUser = new UserModel({
    _id: userId,
    username: 'test',
    active: true,
    roleId: new RoleModel({
      _id: mongoose.Types.ObjectId(),
      permissions,
    })
  });

  const token = {
    _id: mongoose.Types.ObjectId(),
    token: '12345',
    deviceId: mongoose.Types.ObjectId(),
    userId: {
      populate: function(field, callback) {
        callback(null, mockUser);
      }
    },
    user: mockUser
  };

  return token;
}


module.exports = createToken;
