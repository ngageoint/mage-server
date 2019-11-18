import { textField } from 'material-components-web';

class LayerEditController {

  constructor($element, $state, $stateParams, Layer, LayerService) {
    this.$element = $element;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.Layer = Layer,
    this.LayerService = LayerService;

    this.imageryLayer = {};
    this.wmsOptions = {};

    this.urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  }

  $onInit() {
    if (this.$stateParams.layerId) {
      this.Layer.get({id: this.$stateParams.layerId}, layer => {
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
    var elements = this.$element.find('.mdc-text-field');
    for (var i = 0; i < elements.length; i++) {
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
      if (this.layer.url.indexOf('{x}') !== -1 || 
        this.layer.url.indexOf('{y}') !== -1 || 
        this.layer.url.indexOf('{z}') !== -1) {
        this.layer.format = 'XYZ';   
        if (this.validateURL(this.layer.url)) {
          // TODO what does this call?
          this.onValidLayer(this.layer);
        }
      } else if (this.layer.url.toLowerCase().indexOf('wms') !== -1) {
        this.layer.format = 'WMS'; 
      }
    }
  }

  wmsOptionsUpdate(options) {
    this.wmsOptions = options;
  }

  validateURL(str) {
    return !!this.urlPattern.test(str);
  }

  saveLayer() {
    if (this.layer.type === 'GeoPackage' && !this.layer.id) {
      var geopackage = {
        geopackage: this.layer.geopackage,
        type: this.layer.type,
        name: this.layer.name,
        description: this.layer.description
      };

      this.saving = true;
      this.total = this.layer.geopackage.size;
      this.progress = 0;

      this.LayerService.uploadGeopackage(geopackage).then(newLayer => {
        this.saving = false;
        this.$state.go('admin.layer', { layerId: newLayer.id });
      }, () => { // failure
        this.saving = false;
      }, e => { //progress
        this.progress = e.loaded;
        this.total = e.total;
      });
    } else {
      if (this.layer.format === 'WMS') {
        this.layer.wms = this.wmsOptions;
      }

      this.layer.$save({}, () => {
        this.$state.go('admin.layer', { layerId: this.layer.id });
      });
    }
  }

}

LayerEditController.$inject = ['$element', '$state', '$stateParams', 'Layer', 'LayerService'];

export default {
  template: require('./layer.edit.html'),
  bindings: {
    layer: '<',
    onValidLayer: '&',
    onInvalidLayer: '&'
  },
  controller: LayerEditController
};
