var UserModel = require('../models/user')
  , log = require('winston')
  , TokenModel = require('../models/token')
  , DeviceModel = require('../models/device')
  , LoginModel = require('../models/login')
  , path = require('path')
  , fs = require('fs-extra')
  , async = require('async')
  , config = require('../config.json');

var userBase = config.server.userBaseDirectory;

function contentPath(id, user, content, type) {
  var relativePath = path.join(id.toString(), type + path.extname(content.path));
  var absolutePath = path.join(userBase, relativePath);
  return {
    relativePath: relativePath,
    absolutePath: absolutePath
  };
}

function avatarPath(id, user, avatar) {
  return contentPath(id, user, avatar, 'avatar');
}

function iconPath(id, user, icon) {
  return contentPath(id, user, icon, 'icon');
}

function User() {
};

User.prototype.login = function(user, device, options, callback) {
  TokenModel.createToken({userId: user._id, device: device}, function(err, token) {
    if (err) return callback(err);

    callback(err, token);

    LoginModel.createLogin(user, device, function(err, login) {
      if (err) log.error('could not add login', err);
    });
  });
}

User.prototype.logout = function(token, callback) {
  if (!token) return callback();

  TokenModel.removeToken(token, function(err, token) {
    callback(err);
  });
}

User.prototype.count = function(callback) {
  UserModel.count(function(err, count) {
    callback(err, count);
  });
}

User.prototype.getAll = function(filter, callback) {
  if (typeof filter == 'function') {
    callback = filter;
    filter = {};
  }

  UserModel.getUsers(filter, function (err, users) {
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
      var avatar = avatarPath(newUser._id, newUser, options.avatar);
      fs.move(options.avatar.path, avatar.absolutePath, function(err) {
        if (err) {
          return done(err);
        }

        newUser.avatar = {
          relativePath: avatar.relativePath,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        done(null, newUser);
      });
    });
  }

  if (options.icon) {
    operations.push(function(newUser, done) {
      var icon = iconPath(newUser._id, newUser, options.icon);
      fs.move(options.icon.path, icon.absolutePath, function(err) {
        if (err) {
          return done(err);
        }

        newUser.icon = {
          relativePath: icon.relativePath,
          contentType: options.icon.mimetype,
          size: options.icon.size
        };

        done(null, newUser);
      });
    });
  }

  async.waterfall(operations, function(err, newUser) {
    if (err) return callback(err);

    if (!newUser.avatar && !newUser.icon) return callback(null, newUser);

    UserModel.updateUser(newUser, callback);
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
      var avatar = avatarPath(updatedUser._id, updatedUser, options.avatar);
      fs.move(options.avatar.path, avatar.absolutePath, {clobber: true}, function(err) {
        if (err) {
          return done(err);
        }

        updatedUser.avatar = {
          relativePath: avatar.relativePath,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        done(null, updatedUser);
      });
    });
  }

  if (options.icon) {
    operations.push(function(updatedUser, done) {
      var icon = iconPath(updatedUser._id, updatedUser, options.icon);
      fs.move(options.icon.path, icon.absolutePath, {clobber: true}, function(err) {
        if (err) {
          return done(err);
        }

        updatedUser.icon = {
          relativePath: icon.relativePath,
          contentType: options.icon.mimetype,
          size: options.icon.size
        };

        done(null, updatedUser);
      });
    });
  }

  async.waterfall(operations, function(err, updatedUser) {
    if (err) return callback(err);

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

User.prototype.addRecentEvent = function(user, event, callback) {
  UserModel.addRecentEventForUser(user, event, callback);
}

module.exports = User;
