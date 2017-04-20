angular
  .module('mage')
  .directive('leaflet', leaflet);

function leaflet() {
  var directive = {
    restrict: "A",
    replace: true,
    template: '<div id="map" class="leaflet-map"></div>',
    controller: LeafletController
  };

  return directive;
}

LeafletController.$inject = ['$rootScope', '$scope', '$interval', '$timeout', 'MapService', 'LocalStorageService'];

function LeafletController($rootScope, $scope, $interval, $timeout, MapService, LocalStorageService) {

  var layers = {};
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
    trackResize: true
  });

  map.on('moveend', saveMapPosition);

  function saveMapPosition() {
    console.log('save map');
    LocalStorageService.setMapPosition({
      center: map.getCenter(),
      zoom: map.getZoom()
    });
  }

  // toolbar  and controls config
  new L.Control.GeoSearch({
    provider: new L.GeoSearch.Provider.OpenStreetMap(),
    showMarker: false
  }).addTo(map);

  new L.Control.MageFeature({
    onClick: function(latlng) {
      $scope.$emit('observation:create', latlng.wrap());
    }
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

  var layerControl = L.control.groupedLayers();
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
    onPoll: onPoll,
    onLocationStop: onLocationStop,
    onHideFeed: onHideFeed
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
          options.onDragEnd(layer.getLatLng().wrap());
        });
      }

      if (options.selected) layer.addTo(map);
      layers[options.layerId] = {layer: layer};
    }
  }

  function updateMarker(marker, layerId) {
    var layer = layers[layerId];
    if (marker.geometry && marker.geometry.type === 'Point') {
      layer.layer.setLatLng([marker.geometry.coordinates[1], marker.geometry.coordinates[0]]);
    }
  }

  // TODO move into leaflet service, this and map clip both use it
  function createRasterLayer(layerInfo) {
    var options = {};
    if (layerInfo.format === 'XYZ' || layerInfo.format === 'TMS') {
      options = { tms: layerInfo.format === 'TMS', maxZoom: 18 };
      layerInfo.layer = new L.TileLayer(layerInfo.url, options);
    } else if (layerInfo.format === 'WMS') {
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
            var options = {autoPan: false, maxWidth: 400};
            if (popup.closeButton) options.closeButton = popup.closeButton;
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

    _.each(changed.editStarted, function(edit) {
      var layer = layers['Observations'].featureIdToLayer[edit.id];
      layers['Observations'].layer.removeLayer(layer);
      layer.setIcon(L.fixedWidthIcon({
        iconUrl: layer.feature.style.iconUrl,
        tooltip: true
      }));
      layers['EditObservation'] =  layers['EditObservation'] || {
        featureIdToLayer: {}
      };
      layers['EditObservation'].featureIdToLayer[edit.id] = layer;
      layer.addTo(map);
      layer.dragging.enable();
      layer.on('dragend', function() {
        $scope.$broadcast('observation:moved', edit, layer.getLatLng().wrap());
        $scope.$apply();
      });
      layer.setZIndexOffset(1000);
    });

    _.each(changed.editComplete, function(editComplete) {
      var layer = layers['EditObservation'].featureIdToLayer[editComplete.id];
      layer.dragging.disable();
      layer.setZIndexOffset(0);
      map.removeLayer(layer);
      layer.setLatLng({lat: layer.feature.geometry.coordinates[1], lng: layer.feature.geometry.coordinates[0]});
      layer.setIcon(L.fixedWidthIcon({
        iconUrl: layer.feature.style.iconUrl
      }));
      layers['Observations'].layer.addLayer(layer);
    });

    _.each(changed.updateIcon, function(updateIcon) {
      var layer;
      if (layers['EditObservation'] && layers['EditObservation'].featureIdToLayer && layers['EditObservation'].featureIdToLayer[updateIcon.id]) {
        layer = layers['EditObservation'].featureIdToLayer[updateIcon.id];
      } else if (layers['NewObservation']) {
        layer = layers['NewObservation'].layer;
      } else {
        return;
      }
      layer.setIcon(L.fixedWidthIcon({
        iconUrl: updateIcon.iconUrl,
        tooltip: true
      }));
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

      if (featureLayer.options.temporal) {
        var color = colorForFeature(feature, featureLayer.options.temporal);
        layer.setColor(color);
      }

      // Set the lat/lng
      if (feature.geometry.coordinates) {
        if(feature.geometry.type === 'Point'){

          // Set the icon
          if (feature.style && feature.style.iconUrl) {
            layer.setIcon(L.fixedWidthIcon({
              iconUrl: feature.style.iconUrl
            }));
          }

          layer.setLatLng(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates));
          // // TODO fix, this is showing accuracy when a new location comes in.
          // // this should only happen when the popup is openPopup
          // if (featureLayer.options.showAccuracy && layer._popup._isOpen  && layer.getAccuracy()) {
          //   layer.setAccuracy(layer.feature.properties.accuracy);
          // }
        } else{
          featureLayer.layer.removeLayer(layer);
          featureLayer.layer.addLayer(createGeoJsonForLayer(feature, featureLayer));
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
    var layerInfo = layers[layer.name];
    if (layerInfo) {
      map.removeLayer(layerInfo.layer);
      layerControl.removeLayer(layerInfo.layer);
      delete layers[layer.name];
    }
  }

  function onHideFeed(hide) {
    feedControl.hideFeed(hide);
    map.invalidateSize({pan: false});
  }
}
