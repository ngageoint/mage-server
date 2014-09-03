var UserModel = require('../models/user')
  , TokenModel = require('../models/token')
  , path = require('path')
  , fs = require('fs-extra')
  , async = require('async')
  , config = require('../config.json');

var userBase = config.server.userBaseDirectory;

function contentPath(user, content, type) {
  var relative = path.join(user._id.toString(), type + path.extname(content.path));
  var absolute = path.join(userBase, relative);
  return {
    relative: relative,
    absolute: absolute
  };
}

function avatarPath(user, avatar) {
  return contentPath(user, avatar, 'avatar');
}

function iconPath(user, icon) {
  return contentPath(user, avater, 'icon');
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
  var operations = [];
  operations.push(function(done) {
    UserModel.createUser(user, function(err, newUser) {
      done(err, newUser);
    });
  });

  if (options.avatar) {
    operations.push(function(newUser, done) {
      var avatarPath = avatarPath(newUser, options.avatar);
      fs.move(options.avatar.path, avatarPath.absolute, function(err) {
        if (err) {
          console.log('Could not create user avatar');
          return callback(err);
        }

        newUser.avatar = {
          relativePath: avatarPath.relative,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        done(null, newUser);
      });
    });
  }

  if (options.icon) {
    operations.push(function(newUser, done) {
      var iconPath = iconPath(newUser, options.icon);
      fs.move(options.icon.path, iconPath.absolute, function(err) {
        if (err) {
          console.log('Could not create user icon');
          return callback(err);
        }

        newUser.icon = {
          relativePath: iconPath.relative,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        done(null, newUser);
      });
    });
  }

  async.waterfall(operations, function(err, newUser) {
    if (err) return callback(err);

    if (!newUser.avatar && !newUser.icon) return callback(null, newUser);

    UserModel.update(newUser, callback);
  });
}

User.prototype.update = function(user, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var operations = [];
  operations.push(function(done) {
    done(null, user);
  });

  if (options.avatar) {
    operations.push(function(updatedUser, done) {
      var thePath = avatarPath(updatedUser, options.avatar);
      fs.move(options.avatar.path, thePath.absolute, function(err) {
        if (err) {
          console.log('Could not create user avatar');
          return callback(err);
        }

        updatedUser.avatar = {
          relativePath: thePath.relative,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        done(null, updatedUser);
      });
    });
  }

  if (options.icon) {
    operations.push(function(updatedUser, done) {
      var thePath = iconPath(updatedUser, options.icon);
      fs.move(options.icon.path, thePath.absolute, function(err) {
        if (err) {
          console.log('Could not create user icon');
          return callback(err);
        }

        updatedUser.icon = {
          relativePath: thePath.relative,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        done(null, updatedUser);
      });
    });
  }

  async.waterfall(operations, function(err, updatedUser) {
    UserModel.updateUser(updatedUser, callback);
  });
}

User.prototype.delete = function(user, callback) {
  UserModel.deleteUser(user, function(err) {
    callback(err);
  });
}

User.prototype.avatar = function(user, callback) {
  if (!user.avatar.relativePath) return callback();

  var avatar = user.avatar.toObject();
  avatar.path = path.join(userBase, user.avatar.relativePath);

  callback(null, avatar);
}

User.prototype.icon = function(user, callback) {
  if (!user.icon.relativePath) return callback();

  var icon = user.icon;
  icon.path = path.join(userBase, user.icon.relativePath);

  callback(null, icon);
}


module.exports = User;
