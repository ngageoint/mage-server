import countries from '../../mage/countries-land-10km.geo.json';
import L from 'leaflet';

class LayerPreviewController {

  constructor($http, $element) {
    this._$http = $http;
    this._$element = $element;
    this.layers = {};
  }

  $postLink() {
    this.map = L.map(this._$element.find('.leaflet-preview-map')[0], {
      center: [0,0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: true,
      attributionControl: false,
      worldCopyJump: true
    });

    this.map.createPane('newLayer');
    this.map.getPane('newLayer').style.zIndex = 650;

    this.map.addLayer(L.geoJSON(countries, {
      style: function () {
        return {
          color: '#BBBBBB',
          weight: .5,
          fill: true,
          fillColor: '#F9F9F6',
          fillOpacity: 1
        };
      }
    }));
  }

  $doCheck() {
    if (this.layer && this.map && this.needsRefresh()) {
      if (this.mapLayer) {
        this.map.removeLayer(this.mapLayer);
      }
      this.mapLayer = this.createRasterLayer(this.layer);
      if (this.mapLayer) {
        this.showMap = true;
        this.map.addLayer(this.mapLayer);
        if (this.layer.wms && this.layer.wms.extent) {
          this.map.fitBounds([
            [this.layer.wms.extent[1], this.layer.wms.extent[0]],
            [this.layer.wms.extent[3], this.layer.wms.extent[2]]
          ]);
        }
      } else {
        this.showMap = false;
      }
      this.oldUrl = this.layer.url;
      this.oldFormat = this.layer.format;
      this.oldWmsLayersLength = this.layer.wms ? this.layer.wms.layers.length : 0;
      this.oldTransparent = this.layer.wms.transparent;
      this.oldWmsFormat = this.layer.wms.format;
    }
  }

  needsRefresh() {
    return this.layer.format !== this.oldFormat 
    || this.layer.url !== this.oldUrl 
    || (this.layer.wms && this.layer.wms.layers.length !== this.oldWmsLayersLength)
    || (this.layer.wms && this.layer.wms.transparent !== this.oldTransparent)
    || (this.layer.wms && this.layer.wms.format !== this.oldWmsFormat);
  }

  onBaseLayerSelected(baseLayer) {
    var layer = this.layers[baseLayer.name];
    if (layer) this.map.removeLayer(layer.layer);

    layer = this.createRasterLayer(baseLayer);
    this.layers[baseLayer.name] = {type: 'tile', layer: baseLayer, rasterLayer: layer};

    layer.addTo(this.map);
  }

  createRasterLayer(layer) {
    var baseLayer = null;
    var options = {};
    if (layer.format === 'XYZ' || layer.format === 'TMS') {
      options = { tms: layer.format === 'TMS', maxZoom: 18, pane: 'newLayer'};
      baseLayer = new L.TileLayer(layer.url, options);
    } else if (layer.format === 'WMS' && layer.wms) {
      options = {
        layers: layer.wms.layers,
        version: layer.wms.version,
        format: layer.wms.format,
        transparent: layer.wms.transparent,
        pane: 'newLayer'
      };

      if (layer.wms.styles) options.styles = layer.wms.styles;
      baseLayer = new L.TileLayer.WMS(layer.url, options);
    }

    return baseLayer;
  }
}

LayerPreviewController.$inject = ['$http', '$element'];

var template = '<div class="preview-map-container"><div class="leaflet-preview-map"></div></div>';
var bindings = {
  layer: '<'
};
var controller = LayerPreviewController;

export {
  template,
  bindings,
  controller
};
