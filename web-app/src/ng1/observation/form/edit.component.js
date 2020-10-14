module.exports = {
  template: require('./edit.component.html'),
  bindings: {
    form: '<',
    formDefinition: '<',
    geometryStyle: '<',
    onFeatureEdit: '&'
  },
  controller: ['$scope', function ($scope) {
    this.onGeometryEdit = function($event) {
      this.onFeatureEdit({
        $event: $event
      });
    };
  
    this.onGeometryChanged = function($event, field) {
      field.value = $event.feature ? $event.feature.geometry : null;
    };

    // We are calling a downgraded Angular component, as such change detection is
    // not automatically run, force a digest cycle on dropdown selection change
    this.onSelectionChange = function() {
      $scope.$apply();
    }
  }]
};
