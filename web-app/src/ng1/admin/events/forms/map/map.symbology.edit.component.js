import angular from 'angular';

class AdminFormMapSymbologyPickerController {

  constructor() {
    this.minicolorSettings = {
      position: 'bottom left'
    };
  }

  $onInit() {
    this.icon = angular.copy(this.resolve.icon);
    this.style = angular.copy(this.resolve.style);
    this.primary = angular.copy(this.resolve.primary);
    this.variant = angular.copy(this.resolve.variant);
  }

  onFile($event) {
    this.file = $event.file;
  }

  done(styleForm) {
    styleForm.$submitted = true;
    if (styleForm.$invalid) {
      return;
    }

    this.modalInstance.close({
      style: this.style,
      file: this.file,
    });
  }

  cancel() {
    this.modalInstance.dismiss({reason:'cancel'});
  }
}

export default {
  template: require('./map.symbology.edit.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminFormMapSymbologyPickerController
};