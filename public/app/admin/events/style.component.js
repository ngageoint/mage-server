module.exports = {
  template: require('./style.component.html'),
  bindings: {
    title: '@',
    primary: '@',
    variant: '@',
    icon: '<',
    style: '<',
    onStyleChanged: '&',
    onIconAdded: '&'
  },
  controller: StyleController
};

var angular = require('angular');

StyleController.$inject = ['$rootScope', '$uibModal'];

function StyleController($rootScope, $uibModal) {

  this.$onChanges = function(changes) {
    if (changes.style) {
      this.style = angular.copy(this.style);
    }
  };

  var self = this;
  this.updateSymbology = function() {
    var modalInstance = $uibModal.open({
      template: require('./event.symbology.chooser.html'),
      size: 'lg',
      controllerAs: 'vm',
      controller: ['$uibModalInstance', function ($uibModalInstance) {
        var fileToUpload;

        this.icon = self.icon;
        this.style = self.style;
        this.primary = self.primary;
        this.variant = self.variant;

        this.minicolorSettings = {
          position: 'bottom left'
        };

        $rootScope.$on('uploadFile', function(e, uploadId, file) {
          fileToUpload = file;
        });

        this.done = function(styleForm) {
          styleForm.$submitted = true;
          if (styleForm.$invalid) {
            return;
          }

          $uibModalInstance.close({
            style: self.style,
            file: fileToUpload,
          });
        };

        this.cancel = function () {
          $uibModalInstance.dismiss({reason:'cancel'});
        };
      }]
    });

    modalInstance.result.then(function (result) {
      self.onStyleChanged({
        $event: {
          style: result.style,
          primary: self.primary,
          variant: self.variant
        }
      });

      self.style.fill = result.style.fill;
      self.style.stroke = result.style.stroke;
      self.style.fillOpacity = result.style.fillOpacity;
      self.style.strokeOpacity = result.style.strokeOpacity;
      self.style.strokeWidth = result.style.strokeWidth;

      if (result.file) {
        var reader = new FileReader();

        reader.onload = (function() {
          return function(e) {
            self.icon = e.target.result;
            self.onIconAdded({
              $event: {
                icon: e.target.result,
                file: result.file,
                primary: self.primary,
                variant: self.variant
              }
            });
            $rootScope.$apply();
          };
        })(result.file);

        reader.readAsDataURL(result.file);
      }
    });
  };
}
