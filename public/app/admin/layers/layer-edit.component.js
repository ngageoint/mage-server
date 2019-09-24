import { textField } from 'material-components-web';
import template from './layer-edit.component.html';

class LayerEditController {

  constructor($http, $element, $location, LayerService) {
    this._$http = $http;
    this._$element = $element;
    this._$location = $location;
    this._LayerService = LayerService;
  }

  $postLink() {
    var elements = this._$element.find('.mdc-text-field');
    for (var i = 0; i < elements.length; i++) {
      new textField.MDCTextField(elements[i]);
    }
  }

  urlChange() {
    if (!this.layer.format && this.layer.url) {
      if (this.layer.url.indexOf('{x}') !== -1
      || this.layer.url.indexOf('{y}') !== -1
      || this.layer.url.indexOf('{z}') !== -1) {
        this.layer.format = 'XYZ';   
        if (this.validateURL(this.layer.url)) {
          this.onValidLayer(this.layer);
        }
      } else if (this.layer.url.toLowerCase().indexOf('wms') !== -1) {
        this.layer.format = 'WMS'; 
      }
    }
  }

  validateURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
  }

  wmsOptionsUpdate(options) {
    this.layer.wms = options;
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

      this._LayerService.uploadGeopackage(geopackage).then(newLayer => {
        this.saving = false;
        this._$location.path('/admin/layers/' + newLayer.id);
      }, () => { // failure
        this.saving = false;
      }, e => { //progress
        this.progress = e.loaded;
        this.total = e.total;
      });
    } else {
      this.layer.$save({}, () => {
        this._$location.path('/admin/layers/' + this.layer.id);
      });
    }
  }

}

LayerEditController.$inject = ['$http', '$element', '$location', 'LayerService'];

var bindings = {
  layer: '<',
  onValidLayer: '&',
  onInvalidLayer: '&'
};

export {
  template,
  bindings,
  LayerEditController as controller
};
