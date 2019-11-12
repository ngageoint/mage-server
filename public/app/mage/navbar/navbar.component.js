var MDCMenuSurface = require('material-components-web').menuSurface.MDCMenuSurface;

module.exports = {
  template: require('./navbar.component.html'),
  bindings: {
    myself: '<'
  },
  controller: NavbarController
};

NavbarController.$inject = ['$element', '$state', '$transitions', 'UserService'];

function NavbarController($element, $state, $transitions, UserService) {
  var pollingMenu;

  this.$onInit = function() {
    this.state = $state.current.name;
    $transitions.onBefore({}, transition => { 
      this.state = transition.to().name;
    });
  };

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