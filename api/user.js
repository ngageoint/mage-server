var UserModel = require('../models/user')
  , log = require('winston')
  , TokenModel = require('../models/token')
  , LoginModel = require('../models/login')
  , DeviceModel = require('../models/device')
  , path = require('path')
  , fs = require('fs-extra')
  , async = require('async')
  , environment = require('../environment/env');

var userBase = environment.userBaseDirectory;

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
}

User.prototype.login = function(user, device, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  TokenModel.createToken({userId: user._id, device: device}, function(err, token) {
    if (err) return callback(err);

    callback(err, token);

    LoginModel.createLogin(user, device, function(err) {
      if (err) log.error('could not add login', err);
    });

    // set user-agent and mage version on device
    DeviceModel.updateDevice(device._id, {userAgent: options.userAgent, appVersion: options.appVersion}, function(err) {
      if (err) log.error('could not add metadata to device', err);
    });

  });
};

User.prototype.logout = function(token, callback) {
  if (!token) return callback();

  TokenModel.removeToken(token, function(err) {
    callback(err);
  });
};

User.prototype.count = function(callback) {
  UserModel.count(function(err, count) {
    callback(err, count);
  });
};

User.prototype.getAll = function(filter, callback) {
  if (typeof filter === 'function') {
    callback = filter;
    filter = {};
  }

  UserModel.getUsers(filter, function (err, users) {
    callback(err, users);
  });
};

User.prototype.getById = function(id, callback) {
  UserModel.getUserById(id, function(err, user) {
    callback(err, user);
  });
};

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

  if (options.icon && (options.icon.type === 'create' || options.icon.type === 'upload')) {
    operations.push(function(newUser, done) {
      var icon = iconPath(newUser._id, newUser, options.icon);
      fs.move(options.icon.path, icon.absolutePath, function(err) {
        if (err) {
          return done(err);
        }

        newUser.icon.type = options.icon.type;
        newUser.icon.relativePath = icon.relativePath;
        newUser.icon.contentType = options.icon.mimetype;
        newUser.icon.size = options.icon.size;
        newUser.icon.text = options.icon.text;
        newUser.icon.color = options.icon.color;

        done(null, newUser);
      });
    });
  }

  async.waterfall(operations, function(err, newUser) {
    if (err) return callback(err);

    if (!options.avatar && !options.icon) return callback(null, newUser);

    UserModel.updateUser(newUser, callback);
  });
};

User.prototype.update = function(user, options, callback) {
  if (typeof options === 'function') {
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

  if (options.icon && options.icon.type) {
    if (options.icon.type === 'none') {
      if (user.icon.relativePath) {
        // delete it
        operations.push(function(updatedUser, done) {
          var icon = updatedUser.icon;
          icon.path = path.join(userBase, updatedUser.icon.relativePath);

          var iconPaths = iconPath(updatedUser._id, updatedUser, icon);
          fs.remove(iconPaths.absolutePath, function(err) {
            if (err) {
              log.warn('Error removing users map icon from ' + iconPaths.absolutePath);
            }
          });

          updatedUser.icon = {
            type: options.icon.type
          };

          done(null, updatedUser);
        });
      }
    } else {
      operations.push(function(updatedUser, done) {
        var icon = iconPath(updatedUser._id, updatedUser, options.icon);
        fs.move(options.icon.path, icon.absolutePath, {clobber: true}, function(err) {
          if (err) return done(err);

          updatedUser.icon.type = options.icon.type;
          updatedUser.icon.relativePath = icon.relativePath;
          updatedUser.icon.contentType = options.icon.mimetype;
          updatedUser.icon.size = options.icon.size;
          updatedUser.icon.text = options.icon.type === 'create' ? options.icon.text : undefined;
          updatedUser.icon.color = options.icon.type === 'create' ? options.icon.color : undefined;

          done(null, updatedUser);
        });
      });
    }
  }

  async.waterfall(operations, function(err, updatedUser) {
    if (err) return callback(err);

    UserModel.updateUser(updatedUser, callback);
  });
};

User.prototype.delete = function(user, callback) {
  UserModel.deleteUser(user, function(err) {
    callback(err);
  });
};

User.prototype.avatar = function(user, callback) {
  if (!user.avatar.relativePath) return callback();

  var avatar = user.avatar.toObject();
  avatar.path = path.join(userBase, user.avatar.relativePath);

  callback(null, avatar);
};

User.prototype.icon = function(user, callback) {
  if (!user.icon.relativePath) return callback();

  var icon = user.icon;
  icon.path = path.join(userBase, user.icon.relativePath);

  callback(null, icon);
};

User.prototype.addRecentEvent = function(user, event, callback) {
  UserModel.addRecentEventForUser(user, event, callback);
};

module.exports = User;
