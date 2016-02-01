function createToken(userId, permissions) {
  var token = {
    _id: '1',
    token: '12345',
    deviceId: '123',
    userId: {
      populate: function(field, callback) {
        callback(null, {
          _id: userId,
          username: 'test',
          roleId: {
            permissions: permissions
          }
        });
      }
    }
  };

  return token;
}


module.exports = createToken;
