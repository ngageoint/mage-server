var MDCMenuSurface = require('material-components-web').menuSurface.MDCMenuSurface;

module.exports = {
  template: require('./preferences-button.component.html'),
  bindings: {
    drawer: '<'
  },
  controller: PreferencesButtonController
};

PreferencesButtonController.$inject = ['$element', 'LocalStorageService'];

function PreferencesButtonController($element, LocalStorageService) {

  this.preferences = {
    timeZone: LocalStorageService.getTimeZoneView(),
    timeFormat: LocalStorageService.getTimeFormat(),
    coordinateSystem: LocalStorageService.getCoordinateSystemView()
  };
  var preferencesMenu;

  this.openPreferencesChooser = function() {
    if (!this.drawer) {
      preferencesMenu = preferencesMenu || new MDCMenuSurface($element.find('.preferences-menu')[0]);
      preferencesMenu.open(true);
    } else {
      this.expandMenu = !this.expandMenu;
    }
  };

  this.onCoordinateSystemChange = function(coordinateSystem) {
    LocalStorageService.setCoordinateSystemView(coordinateSystem);
  };

  this.onTimeZoneChange = function(timeZone) {
    LocalStorageService.setTimeZoneView(timeZone);
  };

  this.onTimeFormatChange = function(timeFormat) {
    LocalStorageService.setTimeFormat(timeFormat);
  };
}