// Setup mongoose
var mongoose = require('mongoose')
  , Role = require('../models/role');

var userPermissions = [
  'CREATE_FEATURE', 'READ_FEATURE', 'UPDATE_FEATURE', 'DELETE_FEATURE', 
  'CREATE_FFT', 'READ_FFT', 'UPDATE_FFT', 'DELETE_FFT'];

exports.up = function(next) {
  mongoose.connect('mongodb://localhost/sagedb');

  var userRole = {
    name: "USER_ROLE",
    description: "User role, limited acces to MAGE API.",
    permissions: userPermissions
  };

  Role.createRole(userRole, function(err, role) {
    if (err) {
      mongoose.disconnect();
      return next(err);
    }

    mongoose.disconnect(next);
  });
};

exports.down = function(next) {
  mongoose.connect('mongodb://localhost/sagedb');

  Role.getRole("USER_ROLE", function(err, role) {
    if (err) {
      mongoose.disconnect();
      return next(err);
    }

    if (!role) {
      mongoose.disconnect();
      return next();
    }

    Role.deleteRole(role, function(err, role) {
      mongoose.disconnect(next);
    });
  });
};