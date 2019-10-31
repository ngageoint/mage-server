import angular from 'angular';
import adminUser from './user.component';
import adminUsers from './users.component';
import adminEditUser from './user.edit.component';
import adminBulkUser from './user.bulk.component';
import mapIcon from './map.icon.component';

angular.module('mage')
  .component('adminUser', adminUser)
  .component('adminUsers', adminUsers)
  .component('adminEditUser', adminEditUser)
  .component('adminBulkUser', adminBulkUser)
  .component('mapIcon', mapIcon);
