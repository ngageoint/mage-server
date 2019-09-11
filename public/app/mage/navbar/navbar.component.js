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
  };

  this.openDrawer = function() {
    pollingMenu = pollingMenu || new MDCMenuSurface($element.find('.nav-menu')[0]);
    pollingMenu.open = !pollingMenu.open;
  };

  this.logout = function() {
    UserService.logout();
  };

}