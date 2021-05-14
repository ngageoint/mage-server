import angular from 'angular';
import admin from './admin.component';
import adminTab from './admin.tab.component';
import adminDashboard from './admin.dashboard.component';

angular
  .module('mage')
  .component('admin', admin)
  .component('adminTab', adminTab)
  .component('adminDashboard', adminDashboard);

require('./users');
require('./devices');
require('./events');
require('./layers');
require('./teams');
