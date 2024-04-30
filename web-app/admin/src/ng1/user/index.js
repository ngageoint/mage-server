import angular from 'angular';
import avatarEdit from './avatar.edit.component';
import iconEdit from './icon.edit.component';
import profile from './profile.component';

angular.module('mage')
  .controller('UserResetPasswordController', require('./user.reset.password.controller'))
  .component('userAvatarEdit', avatarEdit)
  .component('userIconEdit', iconEdit)
  .component('userProfile', profile)
  .directive('iconUser', require('./user-icon.directive'));