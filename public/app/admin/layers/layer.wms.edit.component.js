import { textField } from 'material-components-web';

class WmsEditController {

  constructor($http, $element, $timeout) {
    this.$http = $http;
    this.$element = $element;
    this.$timeout = $timeout;
    this.wmsLayer = {};
    this.layerNames = {};
    this.selectedLayers = {};
  }

  $postLink() {
    this.onUrlChange();
  }

  $onChanges(changes) {
    if (changes.layerUrl && changes.layerUrl.currentValue !== changes.layerUrl.previousValue) {
      this.onUrlChange();
    }
  }

  advancedOptionsToggle() {
    this.advancedOptionsExpanded = !this.advancedOptionsExpanded;
    this.$timeout(() => {
      var elements = this.$element.find('.mdc-text-field');
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

  optionsUpdated(layers, extent) {
    this.onWmsOptionsUpdate({options: {
      layers: layers,
      version: this.wms.version,
      transparent: this.wms.transparency,
      format: this.wms.transparency ? 'image/png' : 'image/jpeg',
      styles: this.wms.styles,
      extent: extent,
    }});
  }

  onUrlChange() {
    this.wms = {};

    if (!this.layerUrl) return;

    var options = {
      headers: {
        'content-type': 'application/json'
      }
    };

    this.$http.post('/api/layers/wms/getcapabilities', {url: this.layerUrl.split('?')[0]}, options).then(response => {
      if (response.data.Capability) {
        var layers = [];
        var otherLayers= [];
        this.parseLayer(response.data.Capability.Layer, layers, otherLayers);

        this.wms = {
          response: response.data,
          version: response.data.version,
          transparency: true,
          styles: "",
          layers: layers,
          otherLayers: otherLayers,
          selectedLayers: {}
        };

        if (this.wmsOptions && this.wmsOptions.layers && this.wmsOptions.layers.length) {
          this.wmsOptions.layers.split(",").forEach(name => {
            this.wms.selectedLayers[name] = true;
          });
        }
      } else {
        this.wms = {
          errorMessage: 'Invalid response recieved from WMS Server, please check your url and try again.'
        };
      }
    }, response =>  {
      this.wms = {
        errorMessage: response
      };
    });
  }

  layerToggle(layer) {
    let layers = Object.keys(this.wms.selectedLayers).filter(name => this.wms.selectedLayers[name]).join(',');
    let extent = layer.EX_GeographicBoundingBox || undefined;
    this.optionsUpdated(layers, extent);
  }

  parseLayer(layer, layers, otherLayers, layerHierarchy) {
    let all = Array.isArray(layer) ? layer : [layer];
    all.forEach(layer => {
      if (layer.Name) {
        layer.Title = layerHierarchy ? layerHierarchy + ' - ' + layer.Title : layer.Title;
        if (this.checkLayer(layer)) {
          layers.push(layer);
        } else {
          otherLayers.push(layer);
        }
      }

      if (layer.Layer) {
        this.parseLayer(layer.Layer, layers, otherLayers, layer.Title);
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

export default {
  template: require('./layer.wms.edit.html'),
  bindings: {
    layerUrl: '@',
    wmsOptions: '<',
    onWmsOptionsUpdate: '&'
  },
  controller: WmsEditController
};
