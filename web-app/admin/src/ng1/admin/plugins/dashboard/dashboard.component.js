class PluginsDashboardController {
  constructor($stateRegistry, $state, Plugin) {
    this.Plugin = Plugin;
    this.$state = $state;
    this.$stateRegistry = $stateRegistry;
  }
  
  $onInit() {
  }

  showPlugin() {
    this.$state.go('admin.plugins.image');
  }
}

PluginsDashboardController.$inject = ['$stateRegistry', '$state', 'Plugin'];

export default {
  template: require('./dashboard.html'),
  bindings: {
    plugins: '<'
  },
  controller: PluginsDashboardController
};