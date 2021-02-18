import _ from 'underscore';
import angular from 'angular';
import zxcvbn from 'zxcvbn';

class AdminUserEditController {
  constructor($q, $state, $stateParams, $timeout, Api, LocalStorageService, UserService, UserIconService) {
    this.$q = $q;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$timeout = $timeout;
    this.Api = Api;
    this.LocalStorageService = LocalStorageService;
    this.UserService = UserService;
    this.UserIconService = UserIconService;

    this.token = LocalStorageService.getToken();
    this.roles = [];
    this.canEditRole = _.contains(UserService.myself.role.permissions, 'UPDATE_USER_ROLE');
    this.canUpdatePassword = _.contains(UserService.myself.role.permissions, 'UPDATE_USER_ROLE');

    this.passwordStrengthScore = 0;
    this.passwordStrengthMap = {
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
    this.passwordStatus = {
      status: null,
      msg: null
    };
  }

  $onInit() {

    this.UserService.getRoles().success(roles => {
      this.roles = roles;
    });

    if (this.$stateParams.userId) {
      this.UserService.getUser(this.$stateParams.userId).then(user => {
        this.user = angular.copy(user);

        this.iconMetadata = {
          type: this.user.icon.type,
          text: this.user.icon.text,
          color: this.user.icon.color
        };
      });
    } else {
      this.user = {};
      this.iconMetadata = {
        type: 'none'
      };
    }
  }

  cancel() {
    if (this.user.id) {
      this.$state.go('admin.user', { userId: this.user.id });
    } else {
      this.$state.go('admin.users');
    }
  }

  saveUser() {
    this.saving = true;
    this.error = false;

    if (this.iconMetadata.type === 'create') {
      const canvas = this.iconMetadata.getCanvas();
      this.user.icon = this.UserIconService.canvasToPng(canvas);
    }

    const user = {
      username: this.user.username,
      displayName: this.user.displayName,
      email: this.user.email,
      password: this.user.password,
      passwordconfirm: this.user.passwordconfirm,
      avatar: this.user.avatar,
      icon: this.user.icon,
      iconMetadata: JSON.stringify(this.iconMetadata)
    };

    if (this.user.phones && this.user.phones.length) {
      user.phone = this.user.phones[0].number;
    }

    if (this.user.role) {
      user.roleId = this.user.role.id;
    }

    const failure = response => {
      this.$timeout(() => {
        this.saving = false;
        this.error = response.responseText;
      });
    };

    const progress = e => {
      if (e.lengthComputable) {
        this.$timeout(() => {
          this.uploading = true;
          this.uploadProgress = (e.loaded / e.total) * 100;
        });
      }
    };

    if (this.user.id) {
      this.UserService.updateUser(this.user.id, user, () => {
        this.$state.go('admin.user', { userId: this.user.id });
      }, failure, progress);
    } else {
      this.UserService.createUser(user, newUser => {
        this.$state.go('admin.user', { userId: newUser.id });
      }, failure, progress);
    }
  }

  avatarChanged($event) {
    const avatar = $event.avatar;
    if (!avatar) {
      this.user.avatarData = null;
      this.user.avatar = null;

      return;
    }

    this.user.avatar = avatar;

    if (window.FileReader) {
      const reader = new FileReader();
      reader.onload = (() => {
        return (e) => {
          this.$timeout(() => {
            this.user.avatarData = e.target.result;
          });
        };
      })(avatar);

      reader.readAsDataURL(avatar);
    }
  }

  iconChanged($event) {
    const icon = $event.icon;
    this.user.icon = icon;

    if (window.FileReader) {
      const reader = new FileReader();
      reader.onload = (() => {
        return e => {
          this.$timeout(() => {
            this.user.iconData = e.target.result;
          });
        };
      })(icon);

      reader.readAsDataURL(icon);
    }
  }

  iconTypeChanged(icon) {
    if (icon.type === 'create') {
      this.setIconInitials(this.user.displayName, icon);
      this.setIconColor(icon);
    } else if (icon.type === 'upload') {
      if (this.user.icon && this.user.icon.type !== 'upload') {
        this.user.iconUrl = null;
      }
    } else {
      this.user.icon = null;
      this.user.iconUrl = null;
      this.iconMetadata = {
        type: 'none'
      };
    }
  }

  setIconInitials(name, icon) {
    if (icon.text) return;

    const initials = name.match(/\b\w/g) || [];
    icon.text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
  }

  setIconColor(icon) {
    if (icon.color) return;

    icon.color = '#' + Math.floor(Math.random() * 16777215).toString(16);
  }

  passwordChanged(password) {
    if (password && password.length > 0) {
      const score = password && password.length ? zxcvbn(password, [this.user.username, this.user.displayName, this.user.email]).score : 0;
      this.passwordStrengthScore = score + 1;
      this.passwordStrengthType = this.passwordStrengthMap[score].type;
      this.passwordStrength = this.passwordStrengthMap[score].text;
    } else {
      this.passwordStrengthScore = 0;
      this.passwordStrengthType = null;
      this.passwordStrength = null;
    }
  }

  updatePassword(form) {
    form.passwordconfirm.$setValidity("nomatch", this.user.password === this.user.passwordconfirm);

    if (!form.$valid) return;

    const authentication = {
      password: this.user.password,
      passwordconfirm: this.user.passwordconfirm
    };

    this.UserService.updatePassword(this.user.id, authentication).then(() => {
      this.passwordStrengthScore = 0;
      this.passwordStrengthType = null;
      this.passwordStrength = null;
      this.user.password = "";
      this.user.passwordconfirm = "";
      form.$setPristine(true);
      this.passwordStatus.status = 'success';
      this.passwordStatus.msg = "Password successfully updated.";
    }, response => {
      this.passwordStatus.status = "danger";
      this.passwordStatus.msg = response.data;
    });
  }
}

AdminUserEditController.$inject = ['$q', '$state', '$stateParams', '$timeout', 'Api', 'LocalStorageService', 'UserService', 'UserIconService'];

export default {
  template: require('./user.edit.html'),
  controller: AdminUserEditController
};