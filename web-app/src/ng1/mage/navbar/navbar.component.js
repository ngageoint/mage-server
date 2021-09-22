var MDCMenuSurface = require('material-components-web').menuSurface.MDCMenuSurface;

module.exports = {
  template: require('./navbar.component.html'),
  bindings: {
    myself: '<',
    onFeedToggle: '&'
  },
  controller: NavbarController
};

NavbarController.$inject = ['$element', '$state', '$transitions', 'UserService'];

function NavbarController($element, $state, $transitions, UserService) {
  let pollingMenu;

  this.hasAdminPermission = false;

  this.feed = {
    visible: true
  };

  this.$onInit = function () {
    this.state = $state.current.name;
    $transitions.onSuccess({}, transition => {
      this.state = transition.to().name;
    });
  };

  this.$onChanges = function(changes) {
    if (changes.myself) {
      this.hasAdminPermission = UserService.amAdmin;
    }
  }

  this.$postLink = function() {
  };

  this.openDrawer = function() {
    pollingMenu = pollingMenu || new MDCMenuSurface($element.find('.nav-menu')[0]);
    pollingMenu.open = !pollingMenu.open;
  };

  this.logout = function() {
    UserService.logout();
  };

  this.toggleFeed = function() {
    this.feed.visible = !this.feed.visible;
    this.onFeedToggle({
        $event: {
        visible: this.feed.visible
      }
    });
  }

}