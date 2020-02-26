import L from 'leaflet';
import _ from 'underscore';
import moment from 'moment';
import MageFeatureEdit from '../leaflet-extensions/FeatureEdit';
import {default as countries} from './countries-land-10km.geo.json';

// TODO this sucks but not sure there is a better way
// Pull in leaflet icons
require('leaflet/dist/images/marker-icon-2x.png');
require('leaflet/dist/images/marker-shadow.png');

require('leaflet.vectorgrid/dist/Leaflet.VectorGrid.js');
require('leaflet-editable');
require('leaflet-groupedlayercontrol');
require('leaflet.markercluster');

L.Icon.Default.imagePath = 'images/';

class LeafletController {
  constructor($timeout, MapService, GeometryService, LocalStorageService, EventService, FilterService) {
    this.$timeout = $timeout;
    this.MapService = MapService;
    this.GeometryService = GeometryService;
    this.LocalStorageService = LocalStorageService;
    this.EventService = EventService;
    this.FilterService = FilterService;

    this.layers = {};
    this.geopackageLayers = {};

    this.temporalLayers = [];
    this.spiderfyState = null;
    this.currentLocation = null;
    this.locationLayer = L.locationMarker([0, 0], { color: '#136AEC' });
  }

  $onInit() {
    let mapPosition = this.LocalStorageService.getMapPosition();
    if (!mapPosition) {
      this.LocalStorageService.setMapPosition({
        center: {
          lng:0,
          lat: 0
        },
        zoom: 3
      });
      mapPosition = this.LocalStorageService.getMapPosition()
    }
    this.map = L.map("map", {
      center: mapPosition.center,
      zoom: mapPosition.zoom,
      minZoom: 0,
      maxZoom: 18,
      trackResize: true,
      worldCopyJump: true,
      editable: true // turn on Leaflet.Editable
    });

    // Create a map pane for our base layers
    this.BASE_LAYER_PANE = 'baseLayerPane';
    this.map.createPane(this.BASE_LAYER_PANE);
    this.map.getPane(this.BASE_LAYER_PANE).style.zIndex = 100;

    this.TILE_LAYER_PANE = 'tileLayerPane';
    this.map.createPane(this.TILE_LAYER_PANE);
    this.map.getPane(this.TILE_LAYER_PANE).style.zIndex = 200;

    this.FEATURE_LAYER_PANE = 'featureLayerPane';
    this.map.createPane(this.FEATURE_LAYER_PANE);
    this.map.getPane(this.FEATURE_LAYER_PANE).style.zIndex = 300;

    this.FEATURE_OVERLAY_PANE = 'featureOverlayPane';
    this.map.createPane(this.FEATURE_OVERLAY_PANE);
    this.map.getPane(this.FEATURE_OVERLAY_PANE).style.zIndex = 399;

    this.MARKER_OVERLAY_PANE = 'markerOverlayPane';
    this.map.createPane(this.MARKER_OVERLAY_PANE);
    this.map.getPane(this.MARKER_OVERLAY_PANE).style.zIndex = 599;
    
    // Add in a base layer of styled GeoJSON in case the tiles do not load
    const FALLBACK_LAYER_PANE = 'fallbackLayerPane';
    this.map.createPane(FALLBACK_LAYER_PANE);
    this.map.getPane(FALLBACK_LAYER_PANE).style.zIndex = 99;
    this.map.addLayer(L.geoJSON(countries, {
      interactive: false,
      style: function () {
        return {
          color: '#BBBBBB',
          weight: .5,
          fill: true,
          fillColor: '#F9F9F6',
          fillOpacity: 1
        };
      },
      pane: FALLBACK_LAYER_PANE
    }));

    this.map.on('moveend', saveMapPosition, this);
    function saveMapPosition() {
      let center = this.map.getCenter();
      this.LocalStorageService.setMapPosition({
        center: L.latLng(L.Util.formatNum(center.lat), L.Util.formatNum(center.lng)),
        zoom: this.map.getZoom()
      });
    }

    // toolbar  and controls config
    L.Control.clearableGeocoder({
      position: 'topleft'
    }).addTo(this.map);

    this.userLocationControl = new L.Control.MageUserLocation({
      onBroadcastLocationClick:  callback => {
        this.MapService.onBroadcastLocation(callback);
      },
      onLocation: this.onLocation.bind(this),
      stopLocation: this.stopLocation.bind(this)
    });

    this.map.addControl(this.userLocationControl);
    this.feedControl = new L.Control.MageListTools({
      onToggle: toggle => {
        this.$timeout(() => {
          this.onToggleFeed({
            $event: {
              hidden: !toggle
            }
          });
        });
      }
    });
    this.map.addControl(this.feedControl);

    var layerControl = L.control.groupedLayers([], [], {
      autoZIndex: false
    });
    layerControl.addTo(this.map);
    this.layerControl = layerControl;

    this.map.on('baselayerchange', baseLayer => {
      var layer = this.layers[baseLayer.name];
      this.MapService.selectBaseLayer(layer);
    });

    this.map.on('overlayadd', overlay => {
      var layer = this.layers[overlay.name];
      this.MapService.overlayAdded(layer);
    });

    // setup my listeners
    this.listener = {
      onLayerRemoved: this.onLayerRemoved.bind(this),
      onLayersChanged: this.onLayersChanged.bind(this),
      onFeaturesChanged: this.onFeaturesChanged.bind(this),
      onFeatureZoom: this.onFeatureZoom.bind(this),
      onFeatureDeselect: this.onFeatureDeselect.bind(this),
      onLocationStop: this.onLocationStop.bind(this),
      onHideFeed: this.onHideFeed.bind(this)
    };
    this.MapService.addListener(this.listener);
    this.MapService.setDelegate(this);

    this.pollListener = {
      onPoll: this.onPoll.bind(this)
    };
    this.EventService.addPollListener(this.pollListener);
  }

  $onDestroy() {
    this.MapService.removeListener(this.listener);
    this.EventService.removePollListener(this.pollListener);
  }

  onPoll() {
    this.adjustTemporalLayers();
  }

  onLocation(location, broadcast) {
    // no need to do anything if the location has not changed
    if (this.currentLocation &&
      (this.currentLocation.lat === location.latlng.lat &&
       this.currentLocation.lng === location.latlng.lng &&
       this.currentLocation.accuracy === location.accuracy)) {
      return;
    }

    this.currentLocation = location;
    this.map.fitBounds(location.bounds);
    this.locationLayer.setLatLng(location.latlng).setAccuracy(location.accuracy);
    if (!this.map.hasLayer(this.locationLayer)) {
      this.map.addLayer(this.locationLayer);
    }
    if (broadcast)
      this.MapService.onLocation(location);
  }

  onLocationStop() {
    this.userLocationControl.stopBroadcast();
  }

  stopLocation() {
    if (this.map.hasLayer(this.locationLayer)) {
      this.map.removeLayer(this.locationLayer);
    }
    this.currentLocation = null;
  }

  onLayersChanged({name, added = [], removed = []}) {
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
      var layer = this.layers[name];
      if (layer) {
        this.map.removeLayer(layer.layer);
        delete layer.layer;
        delete this.layers[removed.layerId];
      }
    });
  }

  createGeoPackageLayer(layerInfo) {
    var filteredEvent = this.FilterService.getEvent();
    layerInfo.tables.forEach(table => {
      if (table.type === 'feature') {
        var styles = {};
        styles[table.name] = {
          weight: 2,
          radius: 3
        };
        table.layer = L.vectorGrid.protobuf('api/events/' + filteredEvent.id + '/layers/' + layerInfo.id + '/' + table.name + '/{z}/{x}/{y}.pbf?access_token={token}', {
          token: this.LocalStorageService.getToken(),
          maxNativeZoom: 18,
          pane: this.FEATURE_LAYER_PANE,
          vectorTileLayerStyles: styles,
          interactive: true,
          rendererFactory: L.canvas.tile,
          getFeatureId: function (feature) {
            feature.properties.id = layerInfo.id + table.name + feature.id;
            return feature.properties.id;
          }
        });
        table.layer.on('click', e => {
          var layer = e.layer;
          table.layer.setFeatureStyle(layer.properties.id, {
            color: '#00FF00'
          });

          var content = '<b>' + table.name + '</b><br><br>';
          var pairs = _.chain(layer.properties).omit('id').pairs().value();
          if (pairs.length) {
            content += '<table class="table table-striped">';
            _.each(pairs, function (pair) {
              content += '<tr>' + '<td>' + pair[0] + '</td>' + '<td>' + pair[1] + '</td>' + '</tr>';
            });
            content += '</table>';
          }

          var popup = L.popup({ maxHeight: 250})
            .setLatLng(e.latlng)
            .setContent(content)
            .on('remove', function () {
              table.layer.resetFeatureStyle(layer.properties.id);
            });

          popup.openOn(this.map);
        });
      } else {
        table.layer = L.tileLayer('api/events/' + filteredEvent.id + '/layers/' + layerInfo.id + '/' + table.name + '/{z}/{x}/{y}.png?access_token={token}', {
          token: this.LocalStorageService.getToken(),
          minZoom: table.minZoom,
          maxZoom: table.maxZoom,
          pane: this.TILE_LAYER_PANE
        });
      }
      var name = layerInfo.name + table.name;
      this.layers[name] = layerInfo;
      this.geopackageLayers[name] = layerInfo;
      this.layerControl.addOverlay(table.layer, table.name, layerInfo.name);
    });
  }

  // TODO move into leaflet service, this and map clip both use it
  createRasterLayer(layerInfo) {
    var options = {};
    if (layerInfo.format === 'XYZ' || layerInfo.format === 'TMS') {
      options = { tms: layerInfo.format === 'TMS', maxZoom: 18 };
      if (layerInfo.base) {
        options.pane = this.BASE_LAYER_PANE;
      }
      layerInfo.layer = new L.TileLayer(layerInfo.url, options);
    } else if (layerInfo.format === 'WMS') {
      options = {
        layers: layerInfo.wms.layers,
        version: layerInfo.wms.version,
        format: layerInfo.wms.format,
        transparent: layerInfo.wms.transparent
      };
      if (layerInfo.base) {
        options.pane = this.BASE_LAYER_PANE;
      }
      if (layerInfo.wms.styles)
        options.styles = layerInfo.wms.styles;
      layerInfo.layer = new L.TileLayer.WMS(layerInfo.url, options);
    }
    this.layers[layerInfo.name] = layerInfo;
    if (layerInfo.base) {
      this.layerControl.addBaseLayer(layerInfo.layer, layerInfo.name);
    } else {
      this.layerControl.addOverlay(layerInfo.layer, layerInfo.name, 'Static Layers');
    }
    if (layerInfo.options && layerInfo.options.selected)
      layerInfo.layer.addTo(this.map);
  }

  createGeoJsonLayer(data) {
    var layerInfo = {
      type: 'geojson',
      name: data.name,
      featureIdToLayer: {},
      options: data.options
    };
    var geojson = this.createGeoJsonForLayer(data.geojson, layerInfo);

    if (data.options.cluster) {
      layerInfo.layer = L.markerClusterGroup().addLayer(geojson);
      layerInfo.layer.on('spiderfied', function () {
        if (this.spiderfyState) {
          this.spiderfyState.layer.openPopup();
        }
      });
    } else {
      layerInfo.layer = geojson;
    }

    this.layers[data.name] = layerInfo;
    if (data.options.temporal)
      this.temporalLayers.push(layerInfo);
    if (data.options.selected)
      layerInfo.layer.addTo(this.map);
    if (!data.options.hidden) {
      this.layerControl.addOverlay(layerInfo.layer, data.name, data.group);
    }
  }

  createGeoJsonForLayer(json, layerInfo, editMode) {
    var popup = layerInfo.options.popup;
    var geojson = L.geoJson(json, {
      pane: this.FEATURE_OVERLAY_PANE,
      onEachFeature: function (feature, layer) {
        if (popup) {
          if (_.isFunction(popup.html)) {
            var options = { autoPan: false, maxWidth: 400 };
            if (popup.closeButton !== undefined)
              options.closeButton = popup.closeButton;
            layer.bindPopup(popup.html(feature), options);
          }
          if (_.isFunction(popup.onOpen)) {
            layer.on('popupopen', function () {
              popup.onOpen(feature);
            });
          }
          if (_.isFunction(popup.onClose)) {
            layer.on('popupclose', function () {
              popup.onClose(feature);
            });
          }
        }
        if (layerInfo.options.showAccuracy) {
          layer.on('popupopen', function () {
            layer.setAccuracy(layer.feature.properties.accuracy);
          });
          layer.on('popupclose', function () {
            layer.setAccuracy(null);
          });
        }
        layerInfo.featureIdToLayer[feature.id] = layer;
      },
      pointToLayer: (feature, latlng) => {
        if (layerInfo.options.temporal) {
          // TODO temporal layers should be fixed width as well, ie use fixedWidthMarker class
          var temporalOptions = {
            pane: this.MARKER_OVERLAY_PANE,
            color: this.colorForFeature(feature, layerInfo.options.temporal)
          };
          if (feature.style && feature.style.iconUrl) {
            temporalOptions.iconUrl = feature.style.iconUrl;
          }
          return L.locationMarker(latlng, temporalOptions);
        } else {
          var options = {
            pane: this.MARKER_OVERLAY_PANE
          };
          if (feature.style && feature.style.iconUrl) {
            options.iconUrl = feature.style.iconUrl;
          }
          options.tooltip = editMode;
          return L.fixedWidthMarker(latlng, options);
        }
      },
      style: function (feature) {
        return feature.style;
      }
    });

    return geojson;
  }

  onFeaturesChanged({name, added = [], updated = [], removed = []}) {
    var featureLayer = this.layers[name];
    added.forEach(feature => {
      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(this.createGeoJsonForLayer(feature, featureLayer));
      } else {
        featureLayer.layer.addData(feature);
      }
    });

    updated.forEach(feature => {
      var layer = featureLayer.featureIdToLayer[feature.id];
      if (!layer)
        return;
      featureLayer.layer.removeLayer(layer);
      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(this.createGeoJsonForLayer(feature, featureLayer));
      } else {
        featureLayer.layer.addData(feature);
      }
    });

    removed.forEach(feature => {
      var layer = featureLayer.featureIdToLayer[feature.id];
      if (layer) {
        delete featureLayer.featureIdToLayer[feature.id];
        featureLayer.layer.removeLayer(layer);
      }
    });
  }

  onFeatureZoom(zoom) {
    var featureLayer = this.layers[zoom.name];
    var layer = featureLayer.featureIdToLayer[zoom.feature.id];
    if (!this.map.hasLayer(featureLayer.layer))
      return;
      
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
    var featureLayer = this.layers[deselected.name];
    var layer = featureLayer.featureIdToLayer[deselected.feature.id];
    if (!this.map.hasLayer(featureLayer.layer))
      return;
    layer.closePopup();
  }

  onLayerRemoved(layer) {
    switch (layer.type) {
    case 'GeoPackage':
      this.removeGeoPackageLayer(layer);
      break;
    default:
      this.removeLayer(layer);
    }
  }

  removeLayer(layer) {
    var layerInfo = this.layers[layer.name];
    if (layerInfo) {
      this.map.removeLayer(layerInfo.layer);
      this.layerControl.removeLayer(layerInfo.layer);
      delete this.layers[layer.name];
    }
  }

  removeGeoPackageLayer(layer) {
    layer.tables.forEach(table => {
      var name = layer.name + table.name;
      this.map.removeLayer(table.layer);
      this.layerControl.removeLayer(table.layer);
      delete this.layers[name];
      delete this.geopackageLayers[name];
    });
  }
  
  onHideFeed(hide) {
    this.feedControl.hideFeed(hide);
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
      this.map.once('moveend', function () {
        layer.openPopup();
      });
      this.map.setView(layer.getLatLng(), options.zoomToLocation ? 17 : this.map.getZoom());
    } else {
      layer.openPopup();
    }
  }

  colorForFeature(feature, options) {
    var age = Date.now() - moment(feature.properties[options.property]).valueOf();
    var bucket = _.find(options.colorBuckets, function (bucket) { return age > bucket.min && age <= bucket.max; });
    return bucket ? bucket.color : null;
  }

  createFeature(feature, delegate) {
    // TODO put Observations in its own pane maybe??
    // TODO pass in layer collection id 'Observations'
    let featureEdit = new MageFeatureEdit(this.map, feature, delegate);

    this.setPaneOpacity([this.FEATURE_OVERLAY_PANE, this.MARKER_OVERLAY_PANE], .5);

    let layer = this.layers['Observations'].featureIdToLayer[feature.id];
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

        this.setPaneOpacity([this.FEATURE_OVERLAY_PANE, this.MARKER_OVERLAY_PANE], 1);
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

        this.setPaneOpacity([this.FEATURE_OVERLAY_PANE, this.MARKER_OVERLAY_PANE], 1);
      }
    };
  }

  setPaneOpacity(panes, opacity) {
    panes = Array.isArray(panes) ? panes : [panes];
    panes.forEach(pane => {
      this.map.getPane(pane).style.opacity = opacity;
    });
  }
}

LeafletController.$inject = ['$timeout', 'MapService', 'GeometryService', 'LocalStorageService', 'EventService', 'FilterService'];

export default {
  template: '<div id="map" class="leaflet-map"></div>',
  bindings: {
    onToggleFeed: '&'
  },
  controller: LeafletController
};
