const User = require('../models/user');

function transformUser(user, options) {
  if (!user) return null;

  user = user.toObject ? user.toObject({ path: options.path, transform: User.transform }) : user;

  return user;
}

function transformUsers(users, options) {
  return users.map(function(user) {
    return transformUser(user, options);
  });
}

exports.transform = function(users, options) {
  options = options || {};
  return Array.isArray(users) ?
    transformUsers(users, options) :
    transformUser(users, options);
};
