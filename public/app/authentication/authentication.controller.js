class AuthenticationController {

  constructor(api, $location) {
    this.api = api;
    this._$location = $location;
  }

  onSuccess() {
    this._$location.path('/map');
  }
}

AuthenticationController.$inject = ['api', '$location'];

export default AuthenticationController;
