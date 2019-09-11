var MDCList = require('material-components-web').list.MDCList;
var MDCMenu = require('material-components-web').menu.MDCMenu;

module.exports = {
  template: require('./polling-button.component.html'),
  bindings: {
    drawer: '<'
  },
  controller: PollingButtonController
};

PollingButtonController.$inject = ['$element', '$timeout', 'PollingService'];

function PollingButtonController($element, $timeout, PollingService) {
  var pollingMenu;
  var pollingList;
  this.pollingIntervals = ['5000', '30000', '120000', '300000'];
  this.pollingInterval = PollingService.getPollingInterval();

  PollingService.addListener(this);

  this.openPollingIntervalChooser = function() {
    if (!this.drawer) {
      pollingMenu = pollingMenu || new MDCMenu($element.find('.polling-menu')[0]);
      pollingMenu.open = !pollingMenu.open;
    } else {
      this.expandMenu = !this.expandMenu;
    }
    $timeout(function() {
      
      pollingList = new MDCList($element.find('.polling-list')[0]);
      pollingList.listen('MDCList:action', function(event) {
        $timeout(function() {
          this.onPollingIntervalChangedByUser(this.pollingIntervals[event.detail.index]);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };


  this.onPollingIntervalChangedByUser = function(pollingInterval) {
    PollingService.setPollingInterval(pollingInterval);
  };

  this.onPollingIntervalChanged = function(pollingInterval) {
    this.pollingInterval = pollingInterval;
  };
}