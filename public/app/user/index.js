var angular = require('angular');

angular.module('mage')
  .controller('UserController', require('./user.controller'))
  .controller('UserResetPasswordController', require('./user.reset.password.controller'))
  .directive('avatarUser', require('./user-avatar.directive'))
  .directive('avatarUserEdit', require('./user-avatar-edit.directive'))
  .directive('iconUser', require('./user-icon.directive'))
  .directive('iconUserEdit', require('./user-icon-edit.directive'))
  .directive('locationPopup', require('./user-popup.directive'))
  .directive('userNewsItem', require('./user-feed.directive'))
  .directive('userView', require('./user-view.directive'));
