// Setup mongoose
var mongoose = require('mongoose')
  , hasher = require('../utilities/pbkdf2')()
  , Role = require('../models/role')
  , User = require('../models/user');

exports.up = function(next) {
  mongoose.connect('mongodb://localhost/sagedb');

  var p***REMOVED***word = 'admin';
  hasher.encryptP***REMOVED***word(p***REMOVED***word, function(err, encryptedP***REMOVED***word) {
    Role.getRole('ADMIN_ROLE', function(err, role) {
      if (err) return next(err);

      if (!role) return next(new Error('No ADMIN_ROLE found to attach to ADMIN_USER'));

      var adminUser = {
        username: 'admin',
        p***REMOVED***word: encryptedP***REMOVED***word,
        firstname: 'admin',
        lastname: 'admin',
        role: role._id
      };

      User.createUser(adminUser, function(err, user) {
        if (err) return next(err);

        mongoose.disconnect(next);
      });
    });
  });
};

exports.down = function(next) {
  mongoose.connect('mongodb://localhost/sagedb');

  User.getUserByUsername('admin', function(err, user) {
    if (err) {
      mongoose.disconnect();
      return next(err);
    }

    if (!user) {
      mongoose.disconnect();
      return next();
    }

    User.deleteUser(user, function(err, user) {
      mongoose.disconnect(next);
    });
  });
};