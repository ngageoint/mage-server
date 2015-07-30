angular
  .module('mage')
  .directive('leaflet', leaflet);

function leaflet() {
  var directive = {
    restrict: "A",
    replace: true,
    template: '<div id="map" cl***REMOVED***="map"></div>',
    controller: LeafletController,
    bindToController: true
  };

  return directive;
}

LeafletController.$inject = ['$rootScope', '$scope', '$interval', 'MapService', 'LocalStorageService'];

function LeafletController($rootScope, $scope, $interval, MapService, LocalStorageService) {
  var layers = {};
  var temporalLayers = [];
  var spiderfyState = null;
  var currentLocation = null;
  var locationLayer = L.locationMarker([0,0], {color: '#136AEC'});
  var map = L.map("map", {
    center: [0,0],
    zoom: 3,
    minZoom: 0,
    maxZoom: 18
  });

  // toolbar  and controls config
  var sidebar = L.control.sidebar('side-bar', {closeButton: false});
  map.addControl(new L.Control.MageFeature({
    onClick: function(latlng) {
      $scope.$emit('observation:create', latlng);
    }
  }));
  map.addControl(new L.Control.MageUserLocation({
    onLocation: onLocation,
    stopLocation: stopLocation
  }));
  map.addControl(new L.Control.MageListTools({
    onClick: function() {
      sidebar.toggle();
    }
  }));
  map.addControl(sidebar);
  sidebar.show();

  var layerControl = L.control.groupedLayers();
  layerControl.addTo(map);
  map.on('baselayerchange', function(baseLayer) {
    var layer = layers[baseLayer.name];
    MapService.selectBaseLayer(layer);
  });

  map.on('overlayadd', function(overlay, name) {
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
    onPoll: onPoll
  };
  MapService.addListener(listener);

  $scope.$on('$destroy', function() {
    MapService.removeListener(listener);
  });

  function createMarker(marker) {
    // cannot create another marker with the same id
    if (layers[marker.layerId]) return;

    var options = marker.options || {};

    if (marker.geometry && marker.geometry.type === 'Point') {
      var latlng = [0, 0];
      if (marker.geometry.coordinates) {
        latlng = [marker.geometry.coordinates[1], marker.geometry.coordinates[0]];
      } else {
        latlng = map.getCenter();
      }

      var layer = L.marker(latlng, {
        draggable: options.draggable,
        icon: L.AwesomeMarkers.newDivIcon({
          icon: 'plus',
          color: 'cadetblue'
        })
      });

      if (_.isFunction(options.onDragEnd)) {
        layer.on('dragend', function() {
          options.onDragEnd(layer.getLatLng());
        });
      }

      if (options.selected) layer.addTo(map);
      layers[marker.layerId] = {layer: layer};
    }
  }

  function updateMarker(marker) {
    var layer = layers[marker.id];
    if (marker.geometry && marker.geometry.type === 'Point') {
      layer.setLatLng([marker.geometry.coordinates[1], marker.geometry.coordinates[0]]);
    }
  }

  // TODO move into leaflet ***REMOVED***, this and map clip both use it
  function createRasterLayer(layerInfo) {
    var baseLayer = null;
    var options = {};
    if (layerInfo.format == 'XYZ' || layerInfo.format == 'TMS') {
      options = { tms: layerInfo.format == 'TMS', maxZoom: 18}
      layerInfo.layer = new L.TileLayer(layerInfo.url, options);
    } else if (layerInfo.format == 'WMS') {
      options = {
        layers: layerInfo.wms.layers,
        version: layerInfo.wms.version,
        format: layerInfo.wms.format,
        transparent: layerInfo.wms.transparent
      };

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

  function createGeoJsonForLayer(json, layerInfo) {
    var popup = layerInfo.options.popup;

    var geojson = L.geoJson(json, {
      onEachFeature: function (feature, layer) {
        if (popup) {
          if (_.isFunction(popup.html)) {
            var options = {autoPan: false};
            if (popup.closeButton != null) options.closeButton = popup.closeButton;
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
          // TODO temporal layers should be fixed width as well, ie use fixedWidthMarker cl***REMOVED***
          var options = {
            color: colorForFeature(feature, layerInfo.options.temporal)
          };
          if (feature.style && feature.style.iconUrl) options.iconUrl = feature.style.iconUrl + '?access_token=' + LocalStorageService.getToken();

          return L.locationMarker(latlng, options);
        } else {
          var options = {};
          if (feature.style && feature.style.iconUrl) options.iconUrl = feature.style.iconUrl + '?access_token=' + LocalStorageService.getToken()
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
      featureIdToLayer: {},
      options: data.options
    };

    var geojson = createGeoJsonForLayer(data.geojson, layerInfo);
    if (data.options.cluster) {
      layerInfo.layer = L.markerClusterGroup().addLayer(geojson);
      layerInfo.layer.on('spiderfied', function(e) {
        if (spiderfyState) {
          spiderfyState.layer.openPopup();
        }
      });
    } else {
      layerInfo.layer = geojson;
    }

    layers[data.name] = layerInfo;
    if (data.options.temporal) temporalLayers.push(layerInfo);

    layerControl.addOverlay(layerInfo.layer, data.name, data.group);
    if (data.options.selected) layerInfo.layer.addTo(map);
  }

  function onLayersChanged(changed) {
    _.each(changed.added, function(added) {
      switch(added.type) {
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
          updateMarker(updated);
          break;
      }
    });

    _.each(changed.removed, function(removed) {
      var layer = layers[removed.layerId];
      if (layer) {
        map.removeLayer(layer.layer);
        delete layer.layer;
        delete layer;
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

      // Copy over the updated feature data
      if (layer.feature) {
        layer.feature = feature;
      }

      // Set the icon
      if (layer.feature && layer.feature.iconUrl !== feature.iconUrl) {
        layer.setIcon(L.urlDivIcon({
            feature: feature,
            token: LocalStorageService.getToken()
          })
        );
      }

      if (featureLayer.options.temporal) {
        var color = colorForFeature(feature, featureLayer.options.temporal);
        layer.setColor(color);
      }

      // Set the lat/lng
      if (feature.geometry.coordinates) {
        layer.setLatLng(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates));
        if (featureLayer.options.showAccuracy && layer.getAccuracy()) {
          layer.setAccuracy(layer.feature.properties.accuracy);
        }
      }
    });

    _.each(changed.removed, function(feature) {
      var layer = featureLayer.featureIdToLayer[feature.id];
      featureLayer.layer.removeLayer(layer);
    });
  }

  function openPopup(layer, options) {
    options = options || {};
    if (options.zoomToLocation) { // && (!bounds.contains(layer.getLatLng()) || zoom != map.getZoom())) {
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
        map.once('zoomend', function() {
          featureLayer.layer.zoomToShowLayer(layer, function() {
            openPopup(layer);
          });
        });
        map.setZoom(17);
      } else {
        featureLayer.layer.zoomToShowLayer(layer, function() {
          openPopup(layer);
        });
      }
    } else {
      openPopup(layer, {zoomToLocation: true});
    }
  }

  function onPoll() {
    adjustTemporalLayers();
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
    var layerInfo = layers[layer.name];
    if (layerInfo) {
      map.removeLayer(layerInfo.layer);
      layerControl.removeLayer(layerInfo.layer);
      delete layers[layer.name];
    }
  }
}
