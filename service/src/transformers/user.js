function transformUser(user, options) {
  if (!user) {
    return null;
  }
  return user.toObject ?
    user.toObject({ path: options.path }) :
    user;
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
