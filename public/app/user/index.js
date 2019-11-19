import angular from 'angular';
import avatarEdit from './avatar.edit.component';
import iconEdit from './icon.edit.component';
import profile from './profile.component';

angular.module('mage')
  .controller('UserResetPasswordController', require('./user.reset.password.controller'))
  .component('userAvatarEdit', avatarEdit)
  .component('userIconEdit', iconEdit)
  .component('userProfile', profile)
  .directive('avatarUser', require('./user-avatar.directive'))
  .directive('iconUser', require('./user-icon.directive'))
  .directive('locationPopup', require('./user-popup.directive'))
  .directive('userNewsItem', require('./user-feed.directive'))
  .directive('userView', require('./user-view.directive'));
