import _ from 'underscore';

import * as angularCore from '@angular/core';
import * as angularCommon from '@angular/common';
import * as angularHybrid from '@uirouter/angular-hybrid';

System.set('app:angular-core', angularCore);
System.set('app:angular-common', angularCommon);
System.set('app:uirouter-hybrid', angularHybrid);

class AdminPluginsController {
  constructor($stateRegistry, $state, Plugin) {
    this.Plugin = Plugin;
    this.$state = $state;
    this.$stateRegistry = $stateRegistry;
  }
  
  $onInit() {
    this.Plugin.query(plugins => {
      this.plugins = plugins;
      plugins.forEach(plugin => this.loadPlugin(plugin));
    })
  }

  loadPlugin(plugin) {
    let url = '/api/plugins/image.umd.js';
    System.import(url).then(m => {
      plugin.rootState = m.PluginModule.rootState();
      this.$stateRegistry.register({
        name: 'admin.plugins.image.**',
        url: '/image',
        loadChildren: () => {
          return m.PluginModule;
        }
      });
    });
  }

  showPlugin(plugin) {
    this.$state.go(plugin.rootState);
  }
}

AdminPluginsController.$inject = ['$stateRegistry', '$state', 'Plugin'];

export default {
  template: require('./plugins.html'),
  bindings: {
  },
  controller: AdminPluginsController
};