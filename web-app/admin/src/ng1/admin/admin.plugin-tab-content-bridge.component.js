
class AdminPluginTabContentBridgeComponent {}

export default {
  template: '<mage-admin-plugin-tab-content [plugin-tab]="$ctrl.pluginTab"></mage-admin-plugin-tab-content>',
  bindings: {
    pluginTab: '<'
  },
  controller: AdminPluginTabContentBridgeComponent
}
