var MDCTopAppBar = require('material-components-web').topAppBar.MDCTopAppBar;
var MDCDrawer = require('material-components-web').drawer.MDCDrawer;
var MDCMenuSurface = require('material-components-web').menuSurface.MDCMenuSurface;

module.exports = {
  template: require('./navbar.component.html'),
  bindings: {
    myself: '<'
  },
  controller: NavbarController
};

NavbarController.$inject = ['$element', '$location', 'UserService'];

function NavbarController($element, $location, UserService) {
  var pollingMenu;
  this.location = $location;

  this.$postLink = function() {
    // this.drawer = new MDCDrawer($element.find('.mdc-drawer')[0]);
  }

  this.openDrawer = function() {
    // this.drawer.open = true;
    pollingMenu = pollingMenu || new MDCMenuSurface($element.find('.nav-menu')[0]);
    pollingMenu.open = true;
  }

  this.logout = function() {
    UserService.logout();
  };

}