var async = require('async')
  , User = require('../models/user');

exports.id = '007-user-icon';

exports.up = function(done) {
  console.log('\nUpdating user icons');

  User.getUsers(function(err, users) {
    if (err) return done(err);

    async.each(users, function(user, done) {
      user.icon = user.icon || {};
      user.icon.type = user.icon.relativePath ? 'upload' : 'none';
      user.save(done);
    }, function(err) {
      done(err);
    });
  });
};

exports.down = function(done) {
  done();
};
