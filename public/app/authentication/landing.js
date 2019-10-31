class LandingController {

  constructor($location) {
    this._$location = $location;
  }

  onSuccess() {
    this._$location.path('/map');
  }
}

LandingController.$inject = ['$location'];

export default {
  template: require('./landing.html'),
  bindings: {
    api: '<'
  },
  controller: LandingController
};
