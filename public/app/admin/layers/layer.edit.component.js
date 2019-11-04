class AdminLayerEditController {
  constructor($state, $stateParams, Layer, LayerService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.Layer = Layer;
    this.LayerService = LayerService;

    this.saving = false;
    this.wmsFormats = ['image/jpeg', 'image/png'];
    this.wmsVersions = ['1.1.1', '1.3.0'];
    this.uploads = [{}];
  }

  $onInit() {
    if (this.$stateParams.layerId) {
      this.Layer.get({id: this.$stateParams.layerId}, layer => {
        this.layer = layer;
      });
    } else {
      this.layer = new this.Layer();
    }
  }

  saveLayer(layer) {
    if (layer.type === 'GeoPackage' && !layer.id) {
      var geopackage = {
        geopackage: layer.geopackage,
        type: layer.type,
        name: layer.name,
        description: layer.description
      };

      this.saving = true;
      this.total = layer.geopackage.size;
      this.progress = 0;

      this.LayerService.uploadGeopackage(geopackage).then(newLayer => {
        this.saving = false;
        this.$state.go('admin.layer', {layerId: newLayer.id});
      }, () => { // failure
        this.saving = false;
      }, e => { //progress
        this.progress = e.loaded;
        this.total = e.total;
      });
    } else {
      layer.$save({}, () => {
        this.$state.go('admin.layer', { layerId: layer.id });
      });
    }
  }

  cancel() {
    if (this.layer.id) {
      this.$state.go('admin.layer', { layerId: this.layer.id });
    } else {
      this.$state.go('admin.layers');
    }
  }

  fileChosen($event) {
    this.layer.geopackage = $event.file;
  }
}

AdminLayerEditController.$inject = ['$state', '$stateParams', 'Layer', 'LayerService'];

export default {
  template: require('./layer.edit.html'),
  controller: AdminLayerEditController
};