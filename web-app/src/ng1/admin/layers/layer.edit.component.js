import { textField, snackbar } from 'material-components-web';

class LayerEditController {
  constructor($element, $state, $stateParams, Layer, LayerService) {
    this.$element = $element;
    this.$state = $state;
    this.$stateParams = $stateParams;
    (this.Layer = Layer), (this.LayerService = LayerService);

    this.imageryLayer = {};
    this.wmsOptions = {};
    this.errorMessage = '';
  }

  $onInit() {
    if (this.$stateParams.layerId) {
      this.Layer.get({ id: this.$stateParams.layerId }, layer => {
        this.layer = layer;

        if (this.layer.format === 'WMS') {
          this.wmsOptions = this.layer.wms;
        }
      });
    } else {
      this.layer = new this.Layer();
    }
  }

  $postLink() {
    this.errorSnackbar = new snackbar.MDCSnackbar(document.querySelector('#error-snackbar'));

    const elements = this.$element.find('.mdc-text-field');
    for (let i = 0; i < elements.length; i++) {
      new textField.MDCTextField(elements[i]);
    }
  }

  layerTypeChange() {
    this.imageryLayer = {};
    this.wmsOptions = {};
    delete this.layer.url;
    delete this.layer.format;
  }

  layerFormatChange() {
    this.wmsOptions = {};
  }

  urlChange() {
    this.wmsOptions = {};

    if (!this.layer.format && this.layer.url) {
      if (
        this.layer.url.indexOf('{x}') !== -1 ||
        this.layer.url.indexOf('{y}') !== -1 ||
        this.layer.url.indexOf('{z}') !== -1
      ) {
        this.layer.format = 'XYZ';
      } else if (this.layer.url.toLowerCase().indexOf('wms') !== -1) {
        this.layer.format = 'WMS';
      }
    }
  }

  wmsOptionsUpdate(options) {
    this.wmsOptions = options;
  }

  onGeoPackageFile($event) {
    this.layer.geopackage = $event.file;
  }

  saveLayer() {
    if (this.layer.type === 'GeoPackage' && !this.layer.id) {
      const geopackage = {
        geopackage: this.layer.geopackage,
        type: this.layer.type,
        name: this.layer.name,
        description: this.layer.description,
      };

      this.saving = true;
      this.total = this.layer.geopackage.size;
      this.progress = 0;

      this.LayerService.uploadGeopackage(geopackage).then(
        newLayer => {
          this.saving = false;
          this.$state.go('admin.layer', { layerId: newLayer.id });
        },
        response => {
          // failure
          this.saving = false;
          if (response.validationErrors) {
            response.validationErrors.forEach(validationError => {
              this.errorMessage += validationError.error + ' ';
            });
            this.errorSnackbar.open();
          } else {
            this.errorMessage = response;
            this.errorSnackbar.open();
          }
        },
        e => {
          //progress
          this.progress = e.loaded;
          this.total = e.total;
        },
      );
    } else {
      if (this.layer.format === 'WMS') {
        this.layer.wms = this.wmsOptions;
      }

      this.layer.$save(
        {},
        () => {
          this.$state.go('admin.layer', { layerId: this.layer.id });
        },
        response => {
          this.errorMessage = response.data;
          this.errorSnackbar.open();
        },
      );
    }
  }
}

LayerEditController.$inject = ['$element', '$state', '$stateParams', 'Layer', 'LayerService'];

export default {
  template: require('./layer.edit.html'),
  bindings: {
    layer: '<',
  },
  controller: LayerEditController,
};
