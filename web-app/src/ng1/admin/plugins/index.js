import angular from 'angular';
import adminPlugins from './plugins.component';
import adminPluginsDashboard from './dashboard/dashboard.component';

angular.module('mage')
  .component('adminPlugins', adminPlugins)
  .component('adminPluginsDashboard', adminPluginsDashboard);
