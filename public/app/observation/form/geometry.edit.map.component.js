class GeometryEditMapController {

  constructor(MapService) {
    this.MapService = MapService;
  }

  gotoGeometry() {
    // Only the main geometry is on the map, identified by having an id.
    // Don't zoom to form/field locations as they are not on the map.
    if (this.feature.id) {
      this.MapService.zoomToFeatureInLayer(this.feature, 'Observations');
    }
  }

  edit(event) {
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
    
    this.onEdit();
  }
}

GeometryEditMapController.$inject = ['MapService'];

export default {
  template: require('./geometry.edit.map.html'),
  bindings: {
    feature: '<',
    showEdit: '<',
    onEdit: '&'
  },
  controller: GeometryEditMapController
};
