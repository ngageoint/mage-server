import angular from 'angular';
import admin from './admin.component';
import adminTab from './admin.tab.component';
import adminDashboard from './admin.dashboard.component';
import adminPluginTabContentBridge from './admin.plugin-tab-content-bridge.component'
import { downgradeComponent } from '@angular/upgrade/static';
import { AdminPluginTabContentComponent } from '../../app/admin/plugin-tab/plugin-tab-content.component';

angular
  .module('mage')
  .component('admin', admin)
  .component('adminTab', adminTab)
  .component('adminDashboard', adminDashboard)
  .component('mageAdminPluginTabContentBridge', adminPluginTabContentBridge)
  .directive('mageAdminPluginTabContent', downgradeComponent({ component: AdminPluginTabContentComponent }));

require('./users');
require('./devices');
require('./events');
require('./layers');
require('./teams');
require('./feeds');
