var _ = require('underscore')
  , L = require('leaflet')
  , moment = require('moment');

var countries = require('./countries-land-10km.geo.json');

module.exports = function leaflet() {
  var directive = {
    restrict: "A",
    replace: true,
    template: '<div id="map" class="leaflet-map"></div>',
    controller: LeafletController
  };

  return directive;
};

// TODO this sucks but not sure there is a better way
// Pull in leaflet icons
require('leaflet/dist/images/marker-icon.png');
require('leaflet/dist/images/marker-icon-2x.png');
require('leaflet/dist/images/marker-shadow.png');

require('leaflet.vectorgrid/dist/Leaflet.VectorGrid.js');
require('leaflet-editable');
require('leaflet-groupedlayercontrol');
require('leaflet.markercluster');

LeafletController.$inject = ['$scope', 'MapService', 'LocalStorageService', 'EventService'];

function LeafletController($scope, MapService, LocalStorageService, EventService) {

  var layers = {};
  var geopackageLayers = {};
  var temporalLayers = [];
  var spiderfyState = null;
  var currentLocation = null;
  var locationLayer = L.locationMarker([0,0], {color: '#136AEC'});
  var mapPosition = LocalStorageService.getMapPosition() || {
    center: [0,0],
    zoom: 3
  };
  var map = L.map("map", {
    center: mapPosition.center,
    zoom: mapPosition.zoom,
    minZoom: 0,
    maxZoom: 18,
    trackResize: true,
    worldCopyJump: true,
    editable: true // turn on Leaflet.Editable
  });

  // Create a map pane for our base layers
  var BASE_LAYER_PANE = 'baseLayerPane';
  map.createPane(BASE_LAYER_PANE);
  map.getPane(BASE_LAYER_PANE).style.zIndex = 100;

  var TILE_LAYER_PANE = 'tileLayerPane';
  map.createPane(TILE_LAYER_PANE);
  map.getPane(TILE_LAYER_PANE).style.zIndex = 200;

  var FEATURE_LAYER_PANE = 'featureLayerPane';
  map.createPane(FEATURE_LAYER_PANE);
  map.getPane(FEATURE_LAYER_PANE).style.zIndex = 300;

  L.Icon.Default.imagePath = 'images/';

  // Add in a base layer of styled GeoJSON in case the tiles do not load
  var FALLBACK_LAYER_PANE = 'fallbackLayerPane';
  map.createPane(FALLBACK_LAYER_PANE);
  map.getPane(FALLBACK_LAYER_PANE).style.zIndex = 99;
  map.addLayer(L.geoJSON(countries, {
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

  map.on('moveend', saveMapPosition);

  function saveMapPosition() {
    LocalStorageService.setMapPosition({
      center: map.getCenter(),
      zoom: map.getZoom()
    });
  }

  // toolbar  and controls config
  L.Control.clearableGeocoder({
    position: 'topleft'
  }).addTo(map);

  var userLocationControl = new L.Control.MageUserLocation({
    onBroadcastLocationClick: function(callback) {
      MapService.onBroadcastLocation(callback);
    },
    onLocation: onLocation,
    stopLocation: stopLocation
  });
  map.addControl(userLocationControl);

  var feedControl = new L.Control.MageListTools({
    onToggle: function(toggle) {
      $scope.$emit('feed:toggle', toggle);
    }
  });
  map.addControl(feedControl);

  var layerControl = L.control.groupedLayers([], [], {
    autoZIndex: false
  });
  layerControl.addTo(map);
  map.on('baselayerchange', function(baseLayer) {
    var layer = layers[baseLayer.name];
    MapService.selectBaseLayer(layer);
  });

  map.on('overlayadd', function(overlay) {
    var layer = layers[overlay.name];
    MapService.overlayAdded(layer);
  });

  function onLocation(location, broadcast) {
    // no need to do anything if the location has not changed
    if (currentLocation &&
        (currentLocation.lat === location.latlng.lat &&
         currentLocation.lng === location.latlng.lng &&
         currentLocation.accuracy === location.accuracy)) {
      return;
    }
    currentLocation = location;

    map.fitBounds(location.bounds);
    locationLayer.setLatLng(location.latlng).setAccuracy(location.accuracy);

    if (!map.hasLayer(locationLayer)) {
      map.addLayer(locationLayer);
    }

    if (broadcast) MapService.onLocation(location);
  }

  function stopLocation() {
    if (map.hasLayer(locationLayer)) {
      map.removeLayer(locationLayer);
    }

    currentLocation = null;
  }

  // setup my listeners
  var listener = {
    onLayerRemoved: onLayerRemoved,
    onLayersChanged: onLayersChanged,
    onFeaturesChanged: onFeaturesChanged,
    onFeatureZoom: onFeatureZoom,
    onLocationStop: onLocationStop,
    onHideFeed: onHideFeed
  };
  MapService.addListener(listener);

  var pollListener = {
    onPoll: onPoll
  };
  EventService.addPollListener(pollListener);

  $scope.$on('$destroy', function() {
    MapService.removeListener(listener);
    EventService.removePollListener(pollListener);
  });

  function createMarker(marker) {
    // cannot create another marker with the same id
    if (layers[marker.layerId]) return;

    if (!layers['Edit']) {
      var editObservationLayer = {
        name: 'Edit',
        group: 'MAGE',
        type: 'geojson',
        options: {
          selected: true
        }
      };
      MapService.createVectorLayer(editObservationLayer);
    }

    var newObservationLayer = {
      name: 'Edit',
      group: 'MAGE',
      type: 'geojson',
      options: {
        selected: true
      }
    };
    MapService.createVectorLayer(newObservationLayer);

    createGeoJsonForLayer(marker, layers['Edit'], true);
    var layer = layers['Edit'].featureIdToLayer[marker.id];
    layers['Edit'].layer.addLayer(layer);
  }

  function updateMarker(marker, layerId) {
    var layer = layers[layerId];
    if (marker.geometry && marker.geometry.type === 'Point') {
      layer.layer.setLatLng([marker.geometry.coordinates[1], marker.geometry.coordinates[0]]);
    }
  }

  function createGeoPackageLayer(layerInfo) {
    _.each(layerInfo.tables, function(table) {
      if (table.type === 'feature') {
        var styles = {};
        styles[table.name] = {
          weight: 2,
          radius: 3
        };

        table.layer = L.vectorGrid.protobuf('api/events/' + $scope.filteredEvent.id + '/layers/' + layerInfo.id + '/' + table.name +'/{z}/{x}/{y}.pbf?access_token={token}', {
          token: LocalStorageService.getToken(),
          maxNativeZoom: 18,
          pane: FEATURE_LAYER_PANE,
          vectorTileLayerStyles: styles,
          interactive: true,
          rendererFactory: L.canvas.tile,
          getFeatureId: function(feature) {
            feature.properties.id = layerInfo.id + table.name + feature.id;
            return feature.properties.id;
          }
        });

        table.layer.on('click', function(e) {
          var layer = e.layer;
          table.layer.setFeatureStyle(layer.properties.id, {
            color: '#00FF00'
          });

          var content = '<b>' + table.name + '</b><br><br>';
          var pairs = _.chain(layer.properties).omit('id').pairs().value();
          if (pairs.length) {
            content += '<table class="table table-striped">';
            _.each(pairs, function(pair) {
              content += '<tr>' + '<td>' + pair[0] + '</td>' +'<td>' + pair[1] + '</td>' + '</tr>';
            });
            content += '</table>';
          }

          var popup = L.popup({
            maxHeight: 250
          })
            .setLatLng(e.latlng)
            .setContent(content)
            .on('remove', function() {
              table.layer.resetFeatureStyle(layer.properties.id);
            });

          popup.openOn(map);
        });
      } else {
        table.layer = L.tileLayer('api/events/' + $scope.filteredEvent.id + '/layers/' + layerInfo.id + '/' + table.name +'/{z}/{x}/{y}.png?access_token={token}', {
          token: LocalStorageService.getToken(),
          minZoom: table.minZoom,
          maxZoom: table.maxZoom,
          pane: TILE_LAYER_PANE
        });
      }

      var name = layerInfo.name + table.name;
      layers[name] = layerInfo;
      geopackageLayers[name] = layerInfo;
      layerControl.addOverlay(table.layer, table.name, layerInfo.name);
    });
  }

  // TODO move into leaflet service, this and map clip both use it
  function createRasterLayer(layerInfo) {
    var options = {};
    if (layerInfo.format === 'XYZ' || layerInfo.format === 'TMS') {
      options = { tms: layerInfo.format === 'TMS', maxZoom: 18 };

      if (layerInfo.base) {
        options.pane = BASE_LAYER_PANE;
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
        options.pane = BASE_LAYER_PANE;
      }

      if (layerInfo.wms.styles) options.styles = layerInfo.wms.styles;
      layerInfo.layer = new L.TileLayer.WMS(layerInfo.url, options);
    }

    layers[layerInfo.name] = layerInfo;

    if (layerInfo.base) {
      layerControl.addBaseLayer(layerInfo.layer, layerInfo.name);
    } else {
      layerControl.addOverlay(layerInfo.layer, layerInfo.name, 'Static Layers');
    }

    if (layerInfo.options && layerInfo.options.selected) layerInfo.layer.addTo(map);
  }

  function colorForFeature(feature, options) {
    var age = Date.now() - moment(feature.properties[options.property]).valueOf();
    var bucket = _.find(options.colorBuckets, function(bucket) { return age > bucket.min && age <= bucket.max; });
    return bucket ? bucket.color : null;
  }

  function createGeoJsonForLayer(json, layerInfo, editMode) {
    var popup = layerInfo.options.popup;
    var geojson = L.geoJson(json, {
      onEachFeature: function (feature, layer) {
        if (popup) {
          if (_.isFunction(popup.html)) {
            var options = {autoPan: false, maxWidth: 400};
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

        if (layerInfo.options.showAccuracy) {
          layer.on('popupopen', function() {
            layer.setAccuracy(layer.feature.properties.accuracy);
          });

          layer.on('popupclose', function() {
            layer.setAccuracy(null);
          });
        }
        layerInfo.featureIdToLayer[feature.id] = layer;
      },
      pointToLayer: function (feature, latlng) {
        if (layerInfo.options.temporal) {
          // TODO temporal layers should be fixed width as well, ie use fixedWidthMarker class
          var temporalOptions = {
            color: colorForFeature(feature, layerInfo.options.temporal)
          };
          if (feature.style && feature.style.iconUrl) {
            temporalOptions.iconUrl = feature.style.iconUrl;
          }

          return L.locationMarker(latlng, temporalOptions);
        } else {
          var options = {};
          if (feature.style && feature.style.iconUrl) {
            options.iconUrl = feature.style.iconUrl;
          }
          options.tooltip = editMode;
          return L.fixedWidthMarker(latlng, options);
        }
      },
      style: function(feature) {
        return feature.style;
      }
    });

    return geojson;
  }

  function createGeoJsonLayer(data) {
    var layerInfo = {
      type: 'geojson',
      name: data.name,
      featureIdToLayer: {},
      options: data.options
    };

    var geojson = createGeoJsonForLayer(data.geojson, layerInfo);
    if (data.options.cluster) {
      layerInfo.layer = L.markerClusterGroup().addLayer(geojson);
      layerInfo.layer.on('spiderfied', function() {
        if (spiderfyState) {
          spiderfyState.layer.openPopup();
        }
      });
    } else {
      layerInfo.layer = geojson;
      
    }

    layers[data.name] = layerInfo;
    if (data.options.temporal) temporalLayers.push(layerInfo);

    if (data.options.selected) layerInfo.layer.addTo(map);

    if (!data.options.hidden) {
      layerControl.addOverlay(layerInfo.layer, data.name, data.group);
    }
  }

  function onLayersChanged(changed) {
    _.each(changed.added, function(added) {
      switch(added.type) {
      case 'GeoPackage':
        createGeoPackageLayer(added);
        break;
      case 'Feature':
        createMarker(added);
        break;
      case 'Imagery':
        createRasterLayer(added);
        break;
      case 'geojson':
        createGeoJsonLayer(added);
        break;
      }
    });

    _.each(changed.updated, function(updated) {
      switch(updated.type) {
      case 'Feature':
        updateMarker(updated, changed.name);
        break;
      }
    });

    _.each(changed.removed, function(removed) {
      var layer = layers[changed.name];
      if (layer) {
        map.removeLayer(layer.layer);
        delete layer.layer;
        delete layers[removed.layerId];
      }
    });
  }

  function onFeaturesChanged(changed) {
    var featureLayer = layers[changed.name];

    _.each(changed.added, function(feature) {
      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(createGeoJsonForLayer(feature, featureLayer));
      } else {
        featureLayer.layer.addData(feature);
      }
    });

    _.each(changed.updated, function(feature) {
      var layer = featureLayer.featureIdToLayer[feature.id];
      if (!layer) return;

      featureLayer.layer.removeLayer(layer);

      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(createGeoJsonForLayer(feature, featureLayer));
      } else {
        featureLayer.layer.addData(feature);
      }
    });

    _.each(changed.removed, function(feature) {
      var layer = featureLayer.featureIdToLayer[feature.id];
      if (layer) {
        delete featureLayer.featureIdToLayer[feature.id];
        featureLayer.layer.removeLayer(layer);
      }
    });
  }

  function openPopup(layer, options) {
    options = options || {};
    if (options.zoomToLocation) {
      map.once('moveend', function() {
        layer.openPopup();
      });

      map.setView(layer.getLatLng(),  options.zoomToLocation ? 17: map.getZoom());
    } else {
      layer.openPopup();
    }
  }

  function onFeatureZoom(zoom) {
    var featureLayer = layers[zoom.name];
    var layer = featureLayer.featureIdToLayer[zoom.feature.id];
    if (!map.hasLayer(featureLayer.layer)) return;

    if (featureLayer.options.cluster) {

      if (map.getZoom() < 17) {

        if (layer.getBounds) {
          map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          });
          openPopup(layer);
        } else {
          map.once('zoomend', function() {
            featureLayer.layer.zoomToShowLayer(layer, function() {
              openPopup(layer);
            });
          });
          map.setView(layer.getLatLng(), 17);
        }
      } else {
        if (layer.getBounds) {
          map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          });
          openPopup(layer);
        } else {
          featureLayer.layer.zoomToShowLayer(layer, function() {
            openPopup(layer);
          });
        }
      }
    } else {
      openPopup(layer, {zoomToLocation: true});
    }
  }

  function onPoll() {
    adjustTemporalLayers();
  }

  function onLocationStop() {
    userLocationControl.stopBroadcast();
  }

  function adjustTemporalLayers() {
    _.each(temporalLayers, function(temporalLayer) {
      _.each(temporalLayer.featureIdToLayer, function(layer) {
        var color = colorForFeature(layer.feature, temporalLayer.options.temporal);
        layer.setColor(color);
      });
    });
  }

  function onLayerRemoved(layer) {
    switch (layer.type) {
    case 'GeoPackage':
      removeGeoPackageLayer(layer);
      break;
    default:
      removeLayer(layer);
    }
  }

  function removeLayer(layer) {
    var layerInfo = layers[layer.name];

    if (layerInfo) {
      map.removeLayer(layerInfo.layer);
      layerControl.removeLayer(layerInfo.layer);
      delete layers[layer.name];
    }
  }

  function removeGeoPackageLayer(layer) {
    _.each(layer.tables, function(table) {
      var name = layer.name + table.name;
      map.removeLayer(table.layer);
      layerControl.removeLayer(table.layer);
      delete layers[name];
      delete geopackageLayers[name];
    });
  }

  function onHideFeed(hide) {
    feedControl.hideFeed(hide);
    map.invalidateSize({pan: false});
  }
}
