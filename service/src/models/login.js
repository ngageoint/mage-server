const mongoose = require('mongoose');
const { LoginModel, MongooseLoginRepository } = require('../adapters/logins/adapters.logins.db.mongoose');

const loginModel = LoginModel(mongoose.connection);

let loginRepo = new MongooseLoginRepository(loginModel);

/**
 * This module is a bridge that keeps the legacy callback API working
 * for the callers (models/user.js, api/user.js) that have not been migrated
 * to the new LoginRepository interface directly.
 */
exports.initialize = function (repos) {
  loginRepo = repos.loginRepo;
};

exports.getLogins = function (options, callback) {
  const filter = options.filter || {};
  loginRepo.findMany(filter, {
    limit: options.limit,
    lastLoginId: options.lastLoginId,
    firstLoginId: options.firstLoginId
  }).then(
    logins => callback(null, logins),
    err => callback(err)
  );
};

exports.createLogin = function (user, device, callback) {
  loginRepo.create({
    user: user._id.toString(),
    device: device ? device._id.toString() : undefined
  }).then(
    login => callback(null, login),
    err => callback(err)
  );
};

exports.removeLoginsForUser = function (user, callback) {
  loginRepo.removeManyForUser(user._id).then(
    () => callback(null),
    err => callback(err)
  );
};
