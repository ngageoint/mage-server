module.exports = {
  template: require('./edit.component.html'),
  bindings: {
    form: '<',
    formDefinition: '<',
    geometryStyle: '<',
    onFeatureEdit: '&'
  },
  controller: [function() {
    this.onGeometryEdit = function($event) {
      this.onFeatureEdit({
        $event: $event
      });
    };
  
    this.onGeometryChanged = function($event, field) {
      field.value = $event.feature ? $event.feature.geometry : null;
    };
  }]
};
