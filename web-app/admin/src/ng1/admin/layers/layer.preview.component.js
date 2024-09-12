import countries from '../../mage/countries-land-10km.geo.json';
import L from 'leaflet';

class LayerPreviewController {
  constructor($element, FeatureService) {
    this.$element = $element;
    this.FeatureService = FeatureService;
  }

  $postLink() {
    this.map = L.map(this.$element.find('.layer-preview-leaflet')[0], {
      center: [0, 0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: true,
      attributionControl: false,
      worldCopyJump: true,
    });

    this.map.createPane('offlinePane').style.zIndex = 100;

    this.map.addLayer(
      L.geoJSON(countries, {
        pane: 'offlinePane',
        style: function() {
          return {
            color: '#BBBBBB',
            weight: 0.5,
            fill: true,
            fillColor: '#F9F9F6',
            fillOpacity: 1,
          };
        },
      }),
    );

    this.updateMap();
  }

  $onChanges() {
    this.updateMap();
  }

  updateMap() {
    if (!this.map) return;

    if (this.mapLayer) {
      this.map.removeLayer(this.mapLayer);
    }

    if (this.bounds) {
      this.map.fitBounds([
        [this.bounds[1], this.bounds[0]],
        [this.bounds[3], this.bounds[2]],
      ]);
    }

    if (this.layers) {
      this.layers.forEach(layer => {
        this.createTileLayer(layer.url);
      });
    } else {
      if (this.url && this.type === 'Feature') {
        this.mapLayer = this.createKmlLayer(this.url);
        return;
      }
      if (!this.url || !this.format) return;

      if (this.format === 'XYZ' || this.format === 'TMS') {
        this.mapLayer = this.createTileLayer(this.url, this.format === 'TMS');
      } else if (this.format === 'WMS') {
        this.mapLayer = this.createWmsLayer(this.url, this.wms);
      }
    }
  }

  createKmlLayer(url) {
    const featuresUrl = new URL(url);
    featuresUrl.pathname += '/features'
    this.FeatureService.loadFeatureUrl(featuresUrl.toString()).then(response => {
      const gjLayer = L.geoJson(response, {
        pointToLayer: (feature, latlng) => {
          const options = {};
          if (feature.style && feature.style.iconUrl) {
            options.iconUrl = feature.style.iconUrl;
          }
          return L.fixedWidthMarker(latlng, options);
        },
        style: function(feature) {
          return feature.style;
        },
      });
      gjLayer.addTo(this.map);
      const bounds = gjLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds);
      }
    });
  }

  createTileLayer(url, tms) {
    const options = { tms: tms, maxZoom: 18 };
    return new L.TileLayer(url, options).addTo(this.map);
  }

  createWmsLayer(url, wms) {
    const options = {
      layers: wms.layers,
      version: wms.version,
      format: wms.format,
      transparent: wms.transparent,
    };

    if (wms.styles) options.styles = wms.styles;

    if (wms.extent) {
      this.map.fitBounds([
        [wms.extent[1], wms.extent[0]],
        [wms.extent[3], wms.extent[2]],
      ]);
    }

    return new L.TileLayer.WMS(url, options).addTo(this.map);
  }
}

LayerPreviewController.$inject = ['$element', 'FeatureService'];

export default {
  template: require('./layer.preview.html'),
  bindings: {
    url: '@',
    type: '@',
    format: '@',
    bounds: '<',
    wms: '<',
    layers: '<',
  },
  controller: LayerPreviewController,
};
