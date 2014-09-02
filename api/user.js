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

// function createAvatarPath(icon, name) {
//   var ext = path.extname(name);
//   var iconPath = icon._form._id.toString();
//   if (icon._type != null) {
//     iconPath = path.join(iconPath, icon._type);
//     if (icon._variant != null) {
//       iconPath = path.join(iconPath, icon._variant + ext);
//     } else {
//       iconPath = path.join(iconPath, "default" + ext);
//     }
//   } else {
//     iconPath = path.join(iconPath, "default" + ext);
//   }
//
//   return iconPath;
// }

// Form.prototype.getAll = function(callback) {
//   FormModel.getAll(function (err, forms) {
//     callback(err, forms);
//   });
// }
//
// Form.prototype.getById = function(id, callback) {
//   FormModel.getById(id, function(err, form) {
//     callback(err, form);
//   });
// }

User.prototype.login = function(user, device, options, callback) {
  TokenModel.createToken({user: user, device: device}, function(err, token) {
    if (err) return callback(err);

    // set user-agent and mage version on user
    // no need to wait for response from this save before returning
    user.userAgent = options.userAgent;
    user.mageVersion = options.version;
    UserModel.updateUser(user, function(err, updatedUser) { /* no-op */ });

    callback(null, token);
  });
}

User.prototype.create = function(form, callback) {
  // FormModel.create(form, function(err, newForm) {
  //
  //   if (!err) {
  //     var rootDir = path.dirname(require.main.filename);
  //
  //     // copy the default icon to a tmp place
  //     fs.copy(path.join(rootDir,'/public/img/default-icon.png'), path.join(os.tmpdir(), newForm.id+'.png'), function(err) {
  //       if (err) { console.log('error creating temp icon', err); return callback(err, newForm); }
  //       console.log('creating the default icon');
  //       new api.Icon(newForm._id).create({name: newForm.id+'.png', path: path.join(os.tmpdir(), newForm.id+'.png')}, function(err, icon) {
  //         callback(err, newForm);
  //       });
  //     });
  //   }
  //
  //   callback(err, newForm);
  // });
}

User.prototype.update = function(user, options, callback) {
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

// Form.prototype.delete = function(id, callback) {
//   FormModel.remove(id, function(err) {
//     if (err) return callback(err);
//
//     var iconPath = new api.Icon(id).getBasePath();
//     fs.remove(iconPath, function(err) {
//       if (err) console.log('could not remove icon dir for deleted form id: ' + id)
//     });
//
//     callback();
//   });
// }

User.prototype.avatar = function(user, callback) {
  if (!user || !user.avatar) return callback();

  var avatar = user.avatar;
  avatar.path = path.join(avatarBase, user.avatar.relativePath);

  callback(null, avatar);
}


module.exports = User;
