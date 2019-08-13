module.exports = {
  template: require('./edit.component.html'),
  bindings: {
    form: '=',
    formDefinition: '='
  },
  controller: function($scope) {
    this.startGeometryEdit = function(field) {
      console.log('start geometry edit', field);
      $scope.$emit('geometry:edit:start', field)
    }
  }
};
