import _ from 'underscore';

class AdminController {
  constructor($scope, $state, $stateParams, $stateRegistry, $transitions, pluginService, UserPagingService, DevicePagingService) {
    this.$scope = $scope;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$stateRegistry = $stateRegistry;
    this.$transitions = $transitions;
    this.pluginService = pluginService;
    this.UserPagingService = UserPagingService;
    this.DevicePagingService = DevicePagingService;

    this.userState = 'inactive';
    this.inactiveUsers = [];
    const defaultUserQueries = this.UserPagingService.constructDefault();
    this.stateAndData = {
      inactive: defaultUserQueries.inactive
    };

    this.deviceState = 'unregistered';
    this.unregisteredDevices = [];
    const defaultDeviceQueries = this.DevicePagingService.constructDefault();
    this.deviceStateAndData = {
      unregistered: defaultDeviceQueries.unregistered
    }

    this.updateStateName();
    this.pluginTabs = []
    // TODO: add loading spinner mask
    this.loading = true;
  }

  $onInit() {
    this.currentAdminPanel = this.$stateParams.adminPanel || "";
    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.inactiveUsers = this.UserPagingService.users(this.stateAndData[this.userState]);
    });
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
    });
    this.$transitions.onSuccess({}, () => {
      this.updateStateName();
    });
    this.pluginService.availablePlugins().then(plugins => {
      const pluginTabs = Object.entries(plugins).reduce((pluginTabs, [ pluginId, plugin ]) => {
        const { adminTab } = plugin.MAGE_WEB_HOOKS
        if (!adminTab) {
          return pluginTabs
        }
        const stateNameSuffix = cleanNameOfPlugin(pluginId)
        const stateName = `admin.plugin-${stateNameSuffix}`
        pluginTabs = pluginTabs.concat({
          id: pluginId,
          title: adminTab.title,
          state: stateName,
          icon: adminTab.icon
        })
        if (this.$stateRegistry.states[stateName]) {
          return pluginTabs
        }
        this.$stateRegistry.register({
          name: stateName,
          url: `/${stateNameSuffix}`,
          component: 'mageAdminPluginTabContentBridge',
          resolve: {
            pluginTab: async () => {
              const module = await this.pluginService.loadPluginModule(pluginId)
              const pluginTab = {
                module,
                tabContentComponent: adminTab.tabContentComponent
              }
              return pluginTab
            }
          }
        })
        return pluginTabs
      }, [])
      this.$scope.$apply(() => {
        this.pluginTabs =  pluginTabs;
        this.loading = false;
      })
    });
  }

  updateStateName() {
    this.stateName = this.$state.current.name;
  }

  userActivated($event) {
    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.inactiveUsers = this.UserPagingService.users(this.stateAndData[this.userState]);
    });
  }

  deviceRegistered($event) {
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
    });
  }

  deviceUnregistered($event) {
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
    });
  }
}

AdminController.$inject = ['$scope', '$state', '$stateParams', '$stateRegistry', '$transitions', 'PluginService', 'UserPagingService', 'DevicePagingService'];

export default {
  template: require('./admin.html'),
  controller: AdminController
};

function cleanNameOfPlugin(pluginId) {
  return pluginId.replace(/(^[^\w+])|([^\w+]$)/, '').replace(/[^\w-_]/g, '-')
}
