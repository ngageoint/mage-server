const UserModel = require('../models/user')
  , log = require('winston')
  , TokenModel = require('../models/token')
  , LoginModel = require('../models/login')
  , DeviceModel = require('../models/device')
  , TeamModel = require('../models/team')
  , AuthenticationConfiguration = require('../models/authenticationconfiguration')
  , path = require('path')
  , fs = require('fs-extra')
  , util = require('util')
  , async = require('async')
  , environment = require('../environment/env');

const userBase = environment.userBaseDirectory;

function contentPath(id, user, content, type) {
  const relativePath = path.join(id.toString(), type + path.extname(content.path));
  const absolutePath = path.join(userBase, relativePath);
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

User.prototype.login = function (user, device, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  TokenModel.createToken({ userId: user._id, device: device }, function (err, token) {
    if (err) return callback(err);

    LoginModel.createLogin(user, device, function (err) {
      if (err) {
        log.error('could not add login', err);
        return callback(err);
      }

      if (device) {
        // set user-agent and mage version on device
        DeviceModel.updateDevice(device._id, { userAgent: options.userAgent, appVersion: options.appVersion }).then(() => {
          callback(null, token);
        }).catch(err => {
          callback(err);
        });
      } else {
        callback(null, token);
      }
    });
  });
};

User.prototype.logout = function (token, callback) {
  if (!token) return callback();

  TokenModel.removeToken(token, function (err) {
    callback(err);
  });
};

User.prototype.count = function (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  UserModel.count(options, callback, function (err, count) {
    callback(err, count);
  });
};

User.prototype.getAll = function (filter, callback) {
  if (typeof filter === 'function') {
    callback = filter;
    filter = {};
  }

  UserModel.getUsers(filter, function (err, users, pageInfo) {
    callback(err, users, pageInfo);
  });
};

User.prototype.getById = function (id, callback) {
  UserModel.getUserById(id, function (err, user) {
    callback(err, user);
  });
};

User.prototype.create = async function (user, options = {}) {

  const authType = user.authentication.type;
  const authName = user.authentication.authenticationConfiguration.name;

  const authenticationConfig = await AuthenticationConfiguration.getConfiguration(authType, authName);

  delete user.authentication.authenticationConfiguration;

  let defaultTeams;
  let defaultEvents
  if (authenticationConfig) {
    user.authentication.authenticationConfigurationId = authenticationConfig._id;
    const requireAdminActivation = authenticationConfig.settings.usersReqAdmin || { enabled: true };
    if (requireAdminActivation) {
      user.active = user.active || !requireAdminActivation.enabled;
    }

    defaultTeams = authenticationConfig.settings.newUserTeams;
    defaultEvents = authenticationConfig.settings.newUserEvents;
  } else {
    throw new Error('No configuration defined for ' + user.authentication.type);
  }

  const newUser = await util.promisify(UserModel.createUser)(user);

  if (options.avatar) {
    try {
      const avatar = avatarPath(newUser._id, newUser, options.avatar);
      await fs.move(options.avatar.path, avatar.absolutePath);

      newUser.avatar = {
        relativePath: avatar.relativePath,
        contentType: options.avatar.mimetype,
        size: options.avatar.size
      };

      await newUser.save();
    } catch { }
  }

  if (options.icon && (options.icon.type === 'create' || options.icon.type === 'upload')) {
    try {
      const icon = iconPath(newUser._id, newUser, options.icon);
      await fs.move(options.icon.path, icon.absolutePath);

      newUser.icon.type = options.icon.type;
      newUser.icon.relativePath = icon.relativePath;
      newUser.icon.contentType = options.icon.mimetype;
      newUser.icon.size = options.icon.size;
      newUser.icon.text = options.icon.text;
      newUser.icon.color = options.icon.color;

      await newUser.save();
    } catch { }
  }

  if (defaultTeams && Array.isArray(defaultTeams)) {
    const addUserToTeam = util.promisify(TeamModel.addUser);
    for (let i = 0; i < defaultTeams.length; i++) {
      try {
        await addUserToTeam({ _id: defaultTeams[i] }, newUser);
      } catch { }
    }
  }

  if (defaultEvents && Array.isArray(defaultEvents)) {
    const addUserToTeam = util.promisify(TeamModel.addUser);
    const getTeamForEvent = util.promisify(TeamModel.getTeamForEvent);

    for (let i = 0; i < defaultEvents.length; i++) {
      const team = await getTeamForEvent({ _id: defaultEvents[i] });
      if (team) {
        try {
          await addUserToTeam(team, newUser);
        } catch { }
      }
    }
  }

  return newUser;
};

User.prototype.update = function (user, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const operations = [];
  operations.push(function (done) {
    done(null, user);
  });

  if (options.avatar) {
    operations.push(function (updatedUser, done) {
      const avatar = avatarPath(updatedUser._id, updatedUser, options.avatar);
      fs.move(options.avatar.path, avatar.absolutePath, { clobber: true }, function (err) {
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
        operations.push(function (updatedUser, done) {
          const icon = updatedUser.icon;
          icon.path = path.join(userBase, updatedUser.icon.relativePath);

          const iconPaths = iconPath(updatedUser._id, updatedUser, icon);
          fs.remove(iconPaths.absolutePath, function (err) {
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
      operations.push(function (updatedUser, done) {
        const icon = iconPath(updatedUser._id, updatedUser, options.icon);
        fs.move(options.icon.path, icon.absolutePath, { clobber: true }, function (err) {
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

  async.waterfall(operations, function (err, updatedUser) {
    if (err) return callback(err);

    UserModel.updateUser(updatedUser, callback);
  });
};

User.prototype.delete = function (user, callback) {
  UserModel.deleteUser(user, function (err) {
    callback(err);
  });
};

User.prototype.avatar = function (user, callback) {
  if (!user.avatar.relativePath) return callback();

  const avatar = user.avatar.toObject();
  avatar.path = path.join(userBase, user.avatar.relativePath);

  callback(null, avatar);
};

User.prototype.icon = function (user, callback) {
  if (!user.icon.relativePath) return callback();

  const icon = user.icon.toObject();
  icon.path = path.join(userBase, user.icon.relativePath);

  callback(null, icon);
};

User.prototype.addRecentEvent = function (user, event, callback) {
  UserModel.addRecentEventForUser(user, event, callback);
};

module.exports = User;