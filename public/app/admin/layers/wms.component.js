import angular from 'angular';
import { textField } from 'material-components-web';

class WmsEditController {

  constructor($http, $element, $timeout) {
    this._$http = $http;
    this._$element = $element;
    this._$timeout = $timeout;
    this.wmsLayer = {};
    this.layerNames = {};
  }

  $onInit() {
    this.oldUrl = angular.copy(this.layerUrl);
  }

  $postLink() {
    this.onUrlChange();
  }

  $doCheck() {
    if (this.oldUrl !== this.layerUrl) {
      this.oldUrl = this.layerUrl;
      this.onUrlChange();
    }
  }

  advancedOptionsToggle() {
    this.advancedOptionsExpanded = !this.advancedOptionsExpanded;
    this._$timeout(() => {
      var elements = this._$element.find('.mdc-text-field');
      for (var i = 0; i < elements.length; i++) {
        new textField.MDCTextField(elements[i]);
      }
    });
  }

  wmsTransparencyToggle() {
    this.optionsUpdated();
  }

  wmsStyleChange() {
    this.optionsUpdated();
  }

  optionsUpdated(layer) {
    this.onWmsOptionsUpdate({options: {
      layers: Object.keys(this.layerNames).join(','),
      version: this.wmsVersion,
      transparent: this.wmsTransparency,
      format: this.wmsTransparency ? 'image/png' : 'image/jpeg',
      styles: this.wmsStyles,
      extent: layer ? layer.EX_GeographicBoundingBox : undefined,
    }});
  }

  onUrlChange() {
    var options = {
      headers: {
        'content-type': 'application/json'
      }
    };

    this._$http.post('/api/layers/wms/getcapabilities', {url: this.layerUrl.split('?')[0]}, options).then(response => {
      this.wmsResponse = response.data;
      this.wmsVersion = this.wmsResponse.version;
      this.wmsTransparency = true;
      this.wmsStyles = "";
      this.response = response;
      this.layers = [];
      this.otherLayers = [];
      if (response.data.Capability) {
        var layer = response.data.Capability.Layer;
        this.parseLayer(layer, this.layers, this.otherLayers);
      } else {
        this.wmsFailureMessage = 'Invalid response recieved from WMS Server';
      }
    }, response => this.wmsFailureMessage = response);
  }

  layerToggle(layer) {
    if (this.layerNames[layer.Name]) {
      delete this.layerNames[layer.Name];
    } else {
      this.layerNames[layer.Name] = layer;
    }
    this.optionsUpdated(layer);
  }

  parseLayer(layer, layers, otherLayers, layerHierarchy) {
    var children = layer.Layer;
    if (!children) return;

    children.forEach(child => {
      if (child.Layer) {
        child.Title = layerHierarchy ? layerHierarchy + ' - ' + child.Title : child.Title;
        this.parseLayer(child, layers, otherLayers, child.Title);
      } else if (this.checkLayer(child)) {
        child.Title = layerHierarchy ? layerHierarchy + ' - ' + child.Title : child.Title;
        layers.push(child);
      } else {
        child.Title = layerHierarchy ? layerHierarchy + ' - ' + child.Title : child.Title;
        otherLayers.push(child);
      }
    });
  }

  checkLayer(layer) {
    var ok = false;
    if (layer.CRS) {
      
      layer.CRS.forEach(crs => {
        if (crs.indexOf('EPSG:3857') !== -1 || crs.indexOf('EPSG:900913') !== -1) {
          ok = true;
        }
      });
    }
    return ok;
  }
}

WmsEditController.$inject = ['$http', '$element', '$timeout'];

var template = require('./wms.component.html');
var bindings = {
  layerUrl: '<',
  onWmsOptionsUpdate: '&'
};
var controller = WmsEditController;

export {
  template,
  bindings,
  controller
};
