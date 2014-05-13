// Setup mongoose
var mongoose = require('mongoose')
  , Role = require('../models/role')
  , server = require('../config').server;

var adminPermissions = [
  'CREATE_DEVICE', 'READ_DEVICE', 'UPDATE_DEVICE', 'DELETE_DEVICE',
  'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'DELETE_USER', 
  'CREATE_ROLE', 'READ_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
  'CREATE_LAYER', 'READ_LAYER', 'UPDATE_LAYER', 'DELETE_LAYER',
  'CREATE_FEATURE', 'READ_FEATURE', 'UPDATE_FEATURE', 'DELETE_FEATURE', 
  'CREATE_LOCATION', 'READ_LOCATION', 'UPDATE_LOCATION', 'DELETE_LOCATION',
  'CREATE_TEAM', 'READ_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM'];

exports.up = function(next) {
  mongoose.connect(server.mongodb.url);

  var adminRole = {
    name: "ADMIN_ROLE",
    description: "Administrative role, full acces to entire MAGE API.",
    permissions: adminPermissions
  };

  Role.createRole(adminRole, function(err, role) {
    if (err) {
      mongoose.disconnect();
      return next(err);
    }

    mongoose.disconnect(next);
  });
};

exports.down = function(next) {
  mongoose.connect(server.mongodb.url);

  Role.getRole("ADMIN_ROLE", function(err, role) {
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