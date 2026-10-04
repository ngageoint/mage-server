const mongoose = require('mongoose');
const { RoleModel, MongooseRoleRepository } = require('../adapters/roles/adapters.roles.db.mongoose');
const { allPermissions: validPermissions } = require('../entities/authorization/entities.permissions');

/**
 * The Role schema now lives in adapters/roles/adapters.roles.db.mongoose.ts.
 * Register it against the default connection the same way the old
 * self-registering schema did, so legacy code that looks the model up
 * directly by name keeps working. Migration scripts and the standalone
 * `migration:run` CLI (bin/migration.js) call this module's functions
 * directly and never call app.ts's initRepositories(), so this cannot
 * depend on an explicit initialize() call to be usable.
 */
const roleModel = RoleModel(mongoose.connection);

/**
 * app.ts's initRepositories() overrides this with a MongooseRoleRepository
 * wired the same way as every other repository in the app layer, but the
 * default constructed here keeps this module self-sufficient for callers
 * (migrations, the standalone migration CLI, auth strategies, legacy
 * routes) that use its callback API directly without going through the app
 * layer bootstrap.
 */
let roleRepo = new MongooseRoleRepository(roleModel);

/**
 * This module is a thin bridge that keeps the legacy callback API working
 * for the handful of callers (migrations, auth strategies, legacy routes)
 * that have not been migrated to the new RoleRepository interface directly.
 */
exports.initialize = function (repos) {
  roleRepo = repos.roleRepo;
};

function assertValidPermissions(permissions) {
  for (const permission of permissions || []) {
    if (!validPermissions[permission]) {
      throw new Error("Permission '" + permission + "' is not a valid permission");
    }
  }
}

exports.getRoleById = function (id, callback) {
  roleRepo.findById(id).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.getRole = function (name, callback) {
  roleRepo.findByName(name).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.getRoles = function (callback) {
  roleRepo.findAll().then(
    roles => callback(null, roles),
    err => callback(err)
  );
};

exports.createRole = function (role, callback) {
  try {
    assertValidPermissions(role.permissions);
  } catch (err) {
    return callback(err);
  }

  roleRepo.create({
    name: role.name,
    description: role.description,
    permissions: role.permissions
  }).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.updateRole = function (id, update, callback) {
  if (update.permissions) {
    try {
      assertValidPermissions(update.permissions);
    } catch (err) {
      return callback(err);
    }
  }

  roleRepo.update({ id, ...update }).then(
    role => callback(null, role),
    err => callback(err)
  );
};

exports.deleteRole = function (role, callback) {
  const id = role.id || role._id;
  roleRepo.removeById(id).then(
    role => callback(null, role),
    err => callback(err)
  );
};
