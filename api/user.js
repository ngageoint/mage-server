var UserModel = require('../models/user')
  , TokenModel = require('../models/token')
  , path = require('path')
  , fs = require('fs-extra')
  , config = require('../config.json');

var avatarBase = config.server.avatarBaseDirectory;

function avatarPath(user, avatar) {
  return path.join(user._id.toString(), "avatar" + path.extname(avatar.path));
}

function User() {
};

User.prototype.login = function(user, device, options, callback) {
  TokenModel.createToken({user: user, device: device}, function(err, token) {
    if (err) return callback(err);

    // set user-agent and mage version on user
    user.userAgent = options.userAgent;
    user.mageVersion = options.version;
    UserModel.updateUser(user, function(err, updatedUser) {
      callback(null, token, updatedUser);
    });
  });
}

User.prototype.logout = function(user, callback) {
  if (!user) return callback();

  TokenModel.removeTokenForUser(user, function(err, token){
    callback(err);
  });
}

User.prototype.getAll = function(callback) {
  UserModel.getUsers(function (err, users) {
    callback(err, users);
  });
}

User.prototype.getById = function(id, callback) {
  UserModel.getUserById(id, function(err, user) {
    callback(err, user);
  });
}

User.prototype.create = function(user, options, callback) {
  UserModel.createUser(user, function(err, newUser) {
    if (err) return callback(err);

    if (options.avatar) {
      var relativePath = avatarPath(newUser, options.avatar);
      fs.move(options.avatar.path, path.join(avatarBase, relativePath), function(err) {
        if (err) {
          console.log('Could not create user avatar');
          return callback(err);
        }

        newUser.avatar = {
          relativePath: relativePath,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        UserModel.updateUser(newUser, callback);
      });
    } else {
      callback(null, newUser);
    }
  });
}

User.prototype.update = function(user, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  if (options.avatar) {
    var relativePath = avatarPath(user, options.avatar);
    fs.move(options.avatar.path, path.join(avatarBase, relativePath), {clobber: true}, function(err) {
      if (err) {
        console.log('Could not save user avatar');
        return callback(err);
      }

      user.avatar = {
        relativePath: relativePath,
        contentType: options.avatar.mimetype,
        size: options.avatar.size
      };
      UserModel.updateUser(user, callback);
    });
  } else {
    UserModel.updateUser(user, callback);
  }
}

User.prototype.delete = function(user, callback) {
  UserModel.deleteUser(user, function(err) {
    callback(err);
  });
}

User.prototype.avatar = function(user, callback) {
  if (!user.avatar.relativePath) return callback();

  var avatar = user.avatar;
  avatar.path = path.join(avatarBase, user.avatar.relativePath);

  callback(null, avatar);
}


module.exports = User;
