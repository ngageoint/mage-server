const MDCTabBar = require('material-components-web').tabBar.MDCTabBar;

module.exports = {
  template: require('./tab-list.component.html'),
  controller: TabListController,
  bindings: {
    tabs: '<',
    onTabSwitch: '&'
  }
};

TabListController.$inject = ['$element', '$timeout'];

function TabListController($element, $timeout) {

  this.$onChanges = function() {
    $timeout(function() {
      const tabBar = new MDCTabBar($element.find('.mdc-tab-bar')[0])

      tabBar.listen('MDCTabBar:activated', function(event) {
        $timeout(function() {
          this.onTabSwitch({index: event.detail.index})
        }.bind(this))
      }.bind(this));

      tabBar.activateTab(0);
    }.bind(this))
  }
}