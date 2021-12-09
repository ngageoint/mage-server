import L from 'leaflet';
import _ from 'underscore';
import moment from 'moment';
import MageFeatureEdit from '../leaflet-extensions/FeatureEdit';
import GeoPackageLayers from '../leaflet-extensions/GeoPackageLayers';
import { default as countries } from './countries-land-10km.geo.json';
import { LocationState } from '../../app/map/controls/location.component';
import { ZoomDirection } from '../../app/map/controls/zoom.component';

require('leaflet.vectorgrid/dist/Leaflet.VectorGrid.js');
require('leaflet-editable');
require('leaflet.markercluster');

L.Icon.Default.imagePath = '/';

class LeafletController {
  constructor(
    $timeout,
    $element,
    MapService,
    GeometryService,
    LocalStorageService,
    EventService,
    FilterService,
    LayerService
  ) {
    this.$timeout = $timeout;
    this.$element = $element;
    this.MapService = MapService;
    this.GeometryService = GeometryService;
    this.LocalStorageService = LocalStorageService;
    this.EventService = EventService;
    this.FilterService = FilterService;
    this.LayerService = LayerService;

    this.layers = {};
    this.temporalLayers = [];
    this.spiderfyState = null;
    this.currentLocation = null;
    this.locationLayer = L.locationMarker([0, 0], { color: '#136AEC' });

    this.locate = LocationState.OFF;
    this.broadcast = LocationState.OFF;

    this.searchMarker;
  }

  $onInit() {
    let mapPosition = this.LocalStorageService.getMapPosition();
    if (!mapPosition) {
      this.LocalStorageService.setMapPosition({
        center: {
          lng: 0,
          lat: 0
        },
        zoom: 3
      });
      mapPosition = this.LocalStorageService.getMapPosition();
    }
    this.map = L.map('map', {
      center: mapPosition.center,
      zoom: mapPosition.zoom,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 18,
      trackResize: true,
      worldCopyJump: true,
      editable: true // turn on Leaflet.Editable
    });

    // Spread out map panes
    // To easily adjust zIndex across all types of layers each feature group,
    // overlay map, etc, will be placed in its own map pane
    this.BASE_LAYER_PANE = 'baseLayerPane'; // Create a map pane for our base layers
    this.map.createPane(this.BASE_LAYER_PANE);
    this.map.getPane(this.BASE_LAYER_PANE).style.zIndex = 100 * 100;

    this.map.getPane('tilePane').style.zIndex = 200 * 100;
    this.map.getPane('overlayPane').style.zIndex = 400 * 100;
    this.map.getPane('shadowPane').style.zIndex = 500 * 100;
    this.map.getPane('markerPane').style.zIndex = 600 * 100;
    this.map.getPane('tooltipPane').style.zIndex = 800 * 100;
    this.map.getPane('popupPane').style.zIndex = 900 * 100;

    // Add in a base layer of styled GeoJSON in case the tiles do not load
    const FALLBACK_LAYER_PANE = 'fallbackLayerPane';
    this.map.createPane(FALLBACK_LAYER_PANE);
    this.map.getPane(FALLBACK_LAYER_PANE).style.zIndex = 1;
    this.map.addLayer(
      L.geoJSON(countries, {
        interactive: false,
        style: function() {
          return {
            color: '#BBBBBB',
            weight: 0.5,
            fill: true,
            fillColor: '#F9F9F6',
            fillOpacity: 1
          };
        },
        pane: FALLBACK_LAYER_PANE
      })
    );

    this.featurePanes = [];

    this.onMapAvailable({ map: this.map });

    this.map.on('locationfound', this.onLocation, this);
    this.map.on('locationerror', function(err) {
      console.log('LOCATION ERROR', err);
    });

    function saveMapPosition() {
      const center = this.map.getCenter();
      this.LocalStorageService.setMapPosition({
        center: L.latLng(L.Util.formatNum(center.lat), L.Util.formatNum(center.lng)),
        zoom: this.map.getZoom()
      });
    }
    this.map.on('moveend', saveMapPosition, this);

    this.geoPackageLayers = new GeoPackageLayers(
      this.map,
      this.layerControl,
      this.LayerService,
      this.FilterService,
      this.LocalStorageService
    );

    this.map.on('baselayerchange', baseLayer => {
      const layer = this.layers[baseLayer.name];
      this.MapService.selectBaseLayer(layer);
    });

    this.map.on('overlayadd', overlay => {
      const layer = this.layers[overlay.name];
      this.MapService.overlayAdded(layer);
    });

    // setup my listeners
    this.listener = {
      onLayerRemoved: this.onLayerRemoved.bind(this),
      onLayersChanged: this.onLayersChanged.bind(this),
      onFeaturesChanged: this.onFeaturesChanged.bind(this),
      onFeatureZoom: this.onFeatureZoom.bind(this),
      onFeatureDeselect: this.onFeatureDeselect.bind(this),
      onLocationStop: this.onLocationStop.bind(this), // TODO what does this do?
      onHideFeed: this.onHideFeed.bind(this)
    };
    this.MapService.addListener(this.listener);
    this.MapService.setDelegate(this);

    this.pollListener = {
      onPoll: this.onPoll.bind(this)
    };
    this.EventService.addPollListener(this.pollListener);
  }

  saveMapPosition() {
    const center = this.map.getCenter();
    this.LocalStorageService.setMapPosition({
      center: L.latLng(L.Util.formatNum(center.lat), L.Util.formatNum(center.lng)),
      zoom: this.map.getZoom()
    });
  }

  $onDestroy() {
    this.MapService.removeListener(this.listener);
    this.EventService.removePollListener(this.pollListener);
  }

  onZoom($event) {
    if ($event.direction === ZoomDirection.IN) {
      this.map.zoomIn(1);
    } else {
      this.map.zoomOut(1);
    }
  }

  onSearch($event) {
    this.onSearchClear();

    this.map.fitBounds(
      L.latLngBounds(
        L.latLng($event.feature.bbox[1], $event.feature.bbox[0]),
        L.latLng($event.feature.bbox[3], $event.feature.bbox[2])
      )
    );

    const popup = L.popup({ className: 'leaflet-material-popup' }).setContent($event.feature.properties.display_name);
    this.searchMarker = L.marker([$event.feature.geometry.coordinates[1], $event.feature.geometry.coordinates[0]])
      .addTo(this.map)
      .bindPopup(popup)
      .openPopup();
  }

  onSearchClear() {
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }
  }

  onPoll() {
    this.adjustTemporalLayers();
  }

  onLocate($event) {
    this.locate = $event.state;
    if (this.locate === LocationState.ON) {
      this.map.locate({
        watch: true,
        setView: false
      });
    } else {
      this.map.stopLocate();

      if (this.map.hasLayer(this.locationLayer)) {
        this.map.removeLayer(this.locationLayer);
      }
      this.currentLocation = null;
    }
  }

  onLocation(location) {
    // no need to do anything if the location has not changed
    if (
      this.currentLocation &&
      this.currentLocation.lat === location.latlng.lat &&
      this.currentLocation.lng === location.latlng.lng &&
      this.currentLocation.accuracy === location.accuracy
    ) {
      return;
    }

    this.currentLocation = location;
    this.map.fitBounds(location.bounds);
    this.locationLayer.setLatLng(location.latlng).setAccuracy(location.accuracy);
    if (!this.map.hasLayer(this.locationLayer)) {
      this.map.addLayer(this.locationLayer);
    }

    if (this.broadcast === LocationState.ON) {
      this.MapService.onLocation(location);
    }
  }

  onBroadcast($event) {
    this.broadcast = $event.state;
    if (this.locate !== LocationState.ON) {
      this.map.locate({
        watch: true,
        setView: false
      });
    }
  }

  onLocationStop() {
    // TODO is this used
    // this.userLocationControl.stopBroadcast();
  }

  onLayersChanged({ name, added = [], removed = [] }) {
    added.forEach(added => {
      switch (added.type) {
        case 'GeoPackage':
          this.createGeoPackageLayer(added);
          break;
        case 'Imagery':
          this.createRasterLayer(added);
          break;
        case 'geojson':
          this.createGeoJsonLayer(added);
          break;
      }
    });

    removed.forEach(removed => {
      const layer = this.layers[name];
      if (layer) {
        this.map.removeLayer(layer.layer);
        delete layer.layer;
        delete this.layers[removed.layerId];
        this.onRemoveLayer({
          layer: layer
        });
      }
    });
  }

  // TODO move into leaflet service, this and map clip both use it
  createRasterLayer(layerInfo) {
    let pane = this.BASE_LAYER_PANE;
    if (!layerInfo.base) {
      pane = `pane-${layerInfo.id}`;
      this.map.createPane(pane);
    }

    let options = {};
    if (layerInfo.format === 'XYZ' || layerInfo.format === 'TMS') {
      options = { tms: layerInfo.format === 'TMS', maxZoom: 18, pane: pane };
      layerInfo.layer = new L.TileLayer(layerInfo.url, options);
    } else if (layerInfo.format === 'WMS') {
      options = {
        layers: layerInfo.wms.layers,
        version: layerInfo.wms.version,
        format: layerInfo.wms.format,
        transparent: layerInfo.wms.transparent,
        pane: pane
      };

      if (layerInfo.wms.styles) options.styles = layerInfo.wms.styles;
      layerInfo.layer = new L.TileLayer.WMS(layerInfo.url, options);
    }

    layerInfo.layer.pane = pane;
    this.layers[layerInfo.name] = layerInfo;

    this.onAddLayer(layerInfo);
  }

  createGeoPackageLayer(layerInfo) {
    layerInfo.tables.forEach(table => {
      const pane = `pane-${layerInfo.id}-${table.name}`;
      this.map.createPane(pane);
      if (table.type === 'feature') {
        this.featurePanes.push(pane);
      }

      table.layer = this.geoPackageLayers.createGeoPackageLayer(table, layerInfo.id, pane);
      this.layers[layerInfo.id + table.name] = table;

      this.onAddLayer({
        type: 'GeoPackage',
        name: table.name,
        table: table,
        layer: table.layer
      });
    });
  }

  createGeoJsonLayer(layerInfo) {
    const pane = `pane-${layerInfo.id}`;
    this.map.createPane(pane);
    this.featurePanes.push(pane);

    layerInfo.featureIdToLayer = {};
    const geojson = this.createGeoJsonForLayer(layerInfo.geojson, layerInfo, pane);

    if (layerInfo.options.cluster) {
      layerInfo.layer = L.markerClusterGroup({
        pane: pane,
        clusterPane: pane
      }).addLayer(geojson);

      layerInfo.layer.on('spiderfied', function() {
        if (this.spiderfyState) {
          this.spiderfyState.layer.openPopup();
        }
      });
    } else {
      layerInfo.layer = geojson;
    }

    layerInfo.layer.pane = pane;
    this.layers[layerInfo.name] = layerInfo;

    if (layerInfo.options.temporal) {
      this.temporalLayers.push(layerInfo);
    }

    if (!layerInfo.options.hidden) {
      this.onAddLayer(layerInfo);
    }
  }

  createGeoJsonForLayer(json, layerInfo, pane, editMode) {
    const popup = layerInfo.options.popup;
    const geojson = L.geoJson(json, {
      pane: pane,
      onEachFeature: function(feature, layer) {
        if (popup) {
          if (_.isFunction(popup.html)) {
            const options = { autoPan: false, maxWidth: 400 };
            if (popup.closeButton !== undefined) options.closeButton = popup.closeButton;
            layer.bindPopup(popup.html(feature), options);
          }
          if (_.isFunction(popup.onOpen)) {
            layer.on('popupopen', function() {
              popup.onOpen(feature);
            });
          }
          if (_.isFunction(popup.onClose)) {
            layer.on('popupclose', function() {
              popup.onClose(feature);
            });
          }
        }
        if (layerInfo.options.onLayer) {
          layerInfo.options.onLayer(layer, feature);
        }
        layerInfo.featureIdToLayer[feature.id] = layer;
      },
      pointToLayer: (feature, latlng) => {
        let marker;

        if (layerInfo.options.temporal) {
          const temporalOptions = {
            pane: pane,
            accuracy: feature.properties.accuracy,
            color: this.colorForFeature(feature, layerInfo.options.temporal)
          };
          if (feature.style && feature.style.iconUrl) {
            temporalOptions.iconUrl = feature.style.iconUrl;
          }
          marker = L.locationMarker(latlng, temporalOptions);
        } else {
          const options = {
            pane: pane,
            accuracy: feature.properties.accuracy
          };
          if (feature.style && feature.style.iconUrl) {
            options.iconUrl = feature.style.iconUrl;
          }
          options.tooltip = editMode;
          marker = L.observationMarker(latlng, options);
        }

        return marker
      },
      style: function(feature) {
        return feature.style;
      }
    });

    return geojson;
  }

  onFeaturesChanged({ name, added = [], updated = [], removed = [] }) {
    const featureLayer = this.layers[name];
    const pane = featureLayer.layer.pane;
    added.forEach(feature => {
      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(this.createGeoJsonForLayer(feature, featureLayer, pane));
      } else {
        featureLayer.layer.addData(feature);
      }
    });

    updated.forEach(feature => {
      const layer = featureLayer.featureIdToLayer[feature.id];
      if (!layer) return;
      featureLayer.layer.removeLayer(layer);
      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(this.createGeoJsonForLayer(feature, featureLayer, pane));
      } else {
        featureLayer.layer.addData(feature);
      }
    });

    removed.forEach(feature => {
      const layer = featureLayer.featureIdToLayer[feature.id];
      if (layer) {
        delete featureLayer.featureIdToLayer[feature.id];
        featureLayer.layer.removeLayer(layer);
      }
    });
  }

  onFeatureZoom(zoom) {
    const featureLayer = this.layers[zoom.name];
    const layer = featureLayer.featureIdToLayer[zoom.feature.id];
    if (!this.map.hasLayer(featureLayer.layer)) return;

    if (featureLayer.options.cluster) {
      if (this.map.getZoom() < 17) {
        if (layer.getBounds) {
          // Zoom and center polyline/polygon
          this.map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          });
          this.openPopup(layer);
        } else {
          // Zoom and center point
          this.map.once('zoomend', () => {
            featureLayer.layer.zoomToShowLayer(layer, () => {
              this.openPopup(layer, { zoomToLocation: false });
            });
          });
          this.map.setView(layer.getLatLng(), 17);
        }
      } else {
        if (layer.getBounds) {
          this.map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          });
          this.openPopup(layer);
        } else {
          featureLayer.layer.zoomToShowLayer(layer, () => {
            this.openPopup(layer, { zoomToLocation: false });
          });
        }
      }
    } else {
      this.openPopup(layer, { zoomToLocation: true });
    }
  }

  onFeatureDeselect(deselected) {
    const featureLayer = this.layers[deselected.name];
    const layer = featureLayer.featureIdToLayer[deselected.feature.id];
    if (!this.map.hasLayer(featureLayer.layer)) return;
    layer.closePopup();
  }

  onLayerRemoved(layer) {
    switch (layer.type) {
      case 'GeoPackage':
        this.removeGeoPackage(layer);
        break;
      default:
        this.removeLayer(layer);
    }
  }

  removeLayer(layer) {
    const layerInfo = this.layers[layer.name];
    if (layerInfo) {
      this.map.removeLayer(layerInfo.layer);
      delete this.layers[layer.name];
      this.onRemoveLayer({
        layer: layer
      })
    }
  }

  removeGeoPackage(layer) {
    layer.tables.forEach(table => {
      const name = layer.id + table.name;
      const layerInfo = this.layers[name];
      if (layerInfo) {
        this.map.removeLayer(table.layer);
        delete this.layers[name];

        this.onRemoveLayer({
          layer: table
        });
      }
    });
  }

  onHideFeed() {
    this.map.invalidateSize({ pan: false });
  }

  adjustTemporalLayers() {
    this.temporalLayers.forEach(temporalLayer => {
      Object.values(temporalLayer.featureIdToLayer).forEach(layer => {
        const color = this.colorForFeature(layer.feature, temporalLayer.options.temporal);
        layer.setColor(color);
      });
    });
  }

  openPopup(layer, options) {
    options = options || {};
    if (options.zoomToLocation) {
      this.map.once('moveend', function() {
        layer.fire('click');
      });
      this.map.setView(layer.getLatLng(), options.zoomToLocation ? 17 : this.map.getZoom());
    } else {
      layer.fire('click');
    }
  }

  colorForFeature(feature, options) {
    const age = Date.now() - moment(feature.properties[options.property]).valueOf();
    const bucket = _.find(options.colorBuckets, function(bucket) {
      return age > bucket.min && age <= bucket.max;
    });
    return bucket ? bucket.color : null;
  }

  createFeature(feature, delegate) {
    // TODO put Observations in its own pane maybe??
    // TODO pass in layer collection id 'Observations'
    let featureEdit = new MageFeatureEdit(this.map, feature, delegate);

    // TODO save feature pane opacitis
    const featurePaneOpacities = this.featurePanes.map(pane => {
      const mapPane = this.map.getPanes()[pane];
      return mapPane.style.opacity || 1
    });
    this.setPaneOpacity(this.featurePanes, 0.5);

    const layer = this.layers['Observations'].featureIdToLayer[feature.id];
    if (layer) {
      this.map.removeLayer(layer);
    }

    return {
      update: feature => {
        featureEdit.stopEdit();
        featureEdit = new MageFeatureEdit(this.map, feature, delegate);
      },
      cancel: () => {
        featureEdit.stopEdit();
        if (layer) {
          this.onFeaturesChanged({
            name: 'Observations',
            updated: [layer.feature]
          });
        }

        this.resetPaneOpacity(this.featurePanes, featurePaneOpacities);
      },
      save: () => {
        const newFeature = featureEdit.stopEdit();
        if (layer) {
          layer.feature.geometry = newFeature.geometry;
          this.onFeaturesChanged({
            name: 'Observations',
            updated: [layer.feature]
          });
        }

        this.resetPaneOpacity(this.featurePanes, featurePaneOpacities);
      }
    };
  }

  setPaneOpacity(panes, opacityFactor) {
    panes.forEach(pane => {
      const mapPane = this.map.getPanes()[pane];
      const opacity = mapPane.style.opacity || 1;
      mapPane.style.opacity = opacity * opacityFactor;
    });
  }

  resetPaneOpacity(panes, opacities) {
    panes.forEach((pane, index) => {
      const mapPane = this.map.getPanes()[pane];
      mapPane.style.opacity = opacities[index];
    });
  }
}

LeafletController.$inject = [
  '$timeout',
  '$element',
  'MapService',
  'GeometryService',
  'LocalStorageService',
  'EventService',
  'FilterService',
  'LayerService'
];

export default {
  template: require('./leaflet.component.html'),
  bindings: {
    onMapAvailable: '&',
    onAddObservation: '&',
    onAddLayer: '&',
    onRemoveLayer: '&'
  },
  controller: LeafletController
};
