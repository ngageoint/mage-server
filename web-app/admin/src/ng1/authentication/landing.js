class LandingController {

  constructor($state) {
    this.$state = $state;
  }

  onSuccess() {
    this.$state.go('map');
  }
}

LandingController.$inject = ['$state'];

export default {
  template: require('./landing.html'),
  bindings: {
    api: '<'
  },
  controller: LandingController
};
