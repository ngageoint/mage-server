import angular from 'angular';
import adminUser from './user.component';
import adminUsers from './users.component';
import adminUserEdit from './user.edit.component';
import adminUserBulk from './user.bulk.component';
import adminUserDelete from './user.delete.component';
import mapIcon from './map.icon.component';

angular.module('mage')
  .component('adminUser', adminUser)
  .component('adminUsers', adminUsers)
  .component('adminUserEdit', adminUserEdit)
  .component('adminUserBulk', adminUserBulk)
  .component('adminUserDelete', adminUserDelete)
  .component('mapIcon', mapIcon);
