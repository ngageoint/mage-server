module.exports = {
  template: require('./navbar.component.html'),
  bindings: {
    myself: '<'
  },
  controller: NavbarController
};

NavbarController.$inject = ['$state', '$transitions', 'UserService'];

function NavbarController($state, $transitions, UserService) {
  this.hasAdminPermission = false;

  this.feed = {
    visible: true
  };

  this.$onInit = function () {
    console.log('hello nav bar init')
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

  this.logout = function() {
    UserService.logout();
  };
}