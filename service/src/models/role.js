const mongoose = require('mongoose')
  , User = require('../models/user')
  , { allPermissions: validPermissions } = require('../entities/authorization/entities.permissions');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

// Collection to hold roles
const RoleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    permissions: [Schema.Types.String]
  },
  {
    versionKey: false,
    toJSON: { transform },
    toObject: { transform }
  }
);

RoleSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const role = this;

  User.removeRoleFromUsers(role, function (err) {
    next(err);
  });
});

RoleSchema.pre('save', function (next) {
  const role = this;

  // only check for valid permission if the permissions have been modified (or is new)
  if (!role.isModified('permissions')) {
    return next();
  }

  for (const permission of role.permissions) {
    if (!validPermissions[permission]) {
      return next(new Error("Permission '" + permission + "' is not a valid permission"));
    }
  }

  next();
});

function transform(role, ret) {
  ret.id = ret._id;
  delete ret._id;
}

// Creates the Model for the Role Schema
const Role = mongoose.model('Role', RoleSchema);

exports.getRoleById = function (id, callback) {
  Role.findById(id).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.getRole = function (name, callback) {
  Role.findOne({ name: name }).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.getRoles = function (callback) {
  const query = {};
  Role.find(query).then(
    roles => callback(null, roles),
    err => callback(err)
  );
};

exports.createRole = function (role, callback) {
  const create = {
    name: role.name,
    description: role.description,
    permissions: role.permissions
  };

  Role.create(create).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.updateRole = function (id, update, callback) {
  Role.findByIdAndUpdate(id, update, { new: true }).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.deleteRole = function (role, callback) {
  role.deleteOne().then(
    () => callback(null, role),
    err => callback(err)
  );
};