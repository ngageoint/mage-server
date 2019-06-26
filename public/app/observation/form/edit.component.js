module.exports = {
  template: require('./edit.component.html'),
  bindings: {
    form: '=',
    formDefinition: '='
  },
  controller: function($scope) {
    this.startGeometryEdit = function(field) {
      $scope.$emit('geometry:edit:start', field)
    }
  }
};
