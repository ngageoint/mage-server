var mongoose = require('mongoose')
  , User = require('../models/user')
  , Permission = require('../models/permission');

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold roles
var RoleSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: false },
  permissions: [Schema.Types.String]
},{
  versionKey: false
});

RoleSchema.pre('remove', function(next) {
  var role = this;

  User.removeRoleFromUsers(role, function(err) {
    next(err);
  });
});

RoleSchema.pre('save', function(next) {
  var role = this;

  // only check for valid permission if the permissions have been modified (or is new)
  if (!role.isModified('permissions')) {
    return next();
  }

  var validPermissions = Permission.getPermissions();
  role.permissions.forEach(function(permission) {
    if (validPermissions.indexOf(permission) === -1) {
      return next(new Error("Permission '" + permission + "' is not a valid permission"));
    }
  });

  next();
});

function transform(user, ret) {
  if ('function' !== typeof user.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
  }
}

RoleSchema.set("toJSON", {
  transform: transform
});

// Creates the Model for the Role Schema
var Role = mongoose.model('Role', RoleSchema);

exports.getRoleById = function(id, callback) {
  Role.findById(id, function(err, role) {
    callback(err, role);
  });
};

exports.getRole = function(name, callback) {
  Role.findOne({name: name}, function(err, role) {
    callback(err, role);
  });
};

exports.getRoles = function(callback) {
  var query = {};
  Role.find(query, function (err, roles) {
    callback(err, roles);
  });
};

exports.createRole = function(role, callback) {
  var create = {
    name: role.name,
    description: role.description,
    permissions: role.permissions
  };

  Role.create(create, function(err, role) {
    callback(err, role);
  });
};

exports.updateRole = function(id, update, callback) {
  Role.findByIdAndUpdate(id, update, {new: true}, function(err, role) {
    callback(err, role);
  });
};

exports.deleteRole = function(role, callback) {
  role.remove(function(err) {
    callback(err, role);
  });
};
