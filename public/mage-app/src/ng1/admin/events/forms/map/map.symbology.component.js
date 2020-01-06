import angular from 'angular';

class MapStyleController {
  constructor($uibModal, $timeout) {
    this.$uibModal = $uibModal;
    this.$timeout = $timeout;
  }

  $onChanges(changes) {
    if (changes.style) {
      this.style = angular.copy(this.style);
    }
  }

  updateSymbology() {
    var modalInstance = this.$uibModal.open({
      component: 'adminEventFormMapSymbologyEdit',
      size: 'lg',
      resolve: {
        icon: () => {
          return this.icon;
        },
        style: () => {
          return this.style;
        },
        primary: () => {
          return this.primary;
        },
        variant: () => {
          this.variant;
        }
      },
    });

    modalInstance.result.then(result => {
      this.onStyleChanged({
        $event: {
          style: result.style,
          primary: this.primary,
          variant: this.variant
        }
      });

      this.style = result.style;

      if (result.file) {
        var reader = new FileReader();

        reader.onload = (() => {
          return e => {
            this.$timeout(() => {
              this.icon = e.target.result;
              this.onIconAdded({
                $event: {
                  icon: e.target.result,
                  file: result.file,
                  primary: this.primary,
                  variant: this.variant
                }
              });
            });
          };
        })(result.file);

        reader.readAsDataURL(result.file);
      }
    });
  }
}

MapStyleController.$inject = ['$uibModal', '$timeout'];

export default {
  template: require('./map.symbology.html'),
  bindings: {
    title: '@',
    primary: '@',
    variant: '@',
    icon: '<',
    style: '<',
    onStyleChanged: '&',
    onIconAdded: '&'
  },
  controller: MapStyleController
};
