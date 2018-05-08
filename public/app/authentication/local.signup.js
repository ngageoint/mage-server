var zxcvbn = require('zxcvbn');

module.exports = {
  template: require('./local.signup.html'),
  bindings: {
    strategy: '<'
  },
  controller: LocalSignupController
};

LocalSignupController.$inject = ['$scope', 'UserService'];

function LocalSignupController($scope, UserService) {
  var passwordStrengthMap = {
    0: {
      type: 'danger',
      text: 'Weak'
    },
    1: {
      type: 'warning',
      text: 'Fair'
    },
    2: {
      type: 'info',
      text: 'Good'
    },
    3: {
      type: 'primary',
      text: 'Strong'
    },
    4: {
      type: 'success',
      text: 'Excellent'
    }
  };

  this.$onInit = function() {
    this.user = {};
  };

  this.signup = function(form) {
    var self = this;

    form.passwordconfirm.$setValidity("nomatch", this.user.password === this.user.passwordconfirm);

    if (!form.$valid) return;

    var user = {
      username: this.user.username,
      displayName: this.user.displayName,
      email: this.user.email,
      phone: this.user.phone,
      password: this.user.password,
      passwordconfirm: this.user.passwordconfirm,
      avatar: this.user.avatar
    };

    // TODO throw in progress
    var progress = function(e) {
      if(e.lengthComputable){
        // TODO fix me
        // $scope.$apply(function() {
        //   $scope.uploading = true;
        //   $scope.uploadProgress = (e.loaded/e.total) * 100;
        // });
      }
    };

    var complete = function() {
      $scope.$apply(function() {
        form.$submitted = false;
        self.user = {};
        self.passwordStrengthScore = 0;
        self.showStatusMessage("Success", "Account created, contact an administrator to activate your account.", "alert-success");
      });
    };

    var failed = function(data) {
      $scope.$apply(function() {
        self.showStatusMessage("There was a problem creating your account", data.responseText, "alert-danger");
      });
    };

    UserService.signup(user, complete, failed, progress);
  };

  this.passwordStrengthScore = 0;
  this.onPasswordChange = function() {
    var score = this.user.password && this.user.password.length ? zxcvbn(this.user.password, [this.user.username, this.user.displayName, this.user.email]).score : 0;
    this.passwordStrengthScore = score + 1;
    this.passwordStrengthType = passwordStrengthMap[score].type;
    this.passwordStrength = passwordStrengthMap[score].text;
  };

  this.showStatusMessage = function (title, message, statusLevel) {
    this.statusTitle = title;
    this.statusMessage = message;
    this.statusLevel = statusLevel;
    this.showStatus = true;
  };

  this.onAvatar = function(event) {
    var avatar = event.avatar;

    this.user.avatar = avatar;
    if (!avatar) {
      this.user.avatarData = null;
      return;
    }

    var self = this;
    if (window.FileReader) {
      var reader = new FileReader();
      reader.onload = (function() {
        return function(e) {
          $scope.$apply(function() {
            self.user.avatarData = e.target.result;
          });
        };
      })(avatar);

      reader.readAsDataURL(avatar);
    }
  };

}
