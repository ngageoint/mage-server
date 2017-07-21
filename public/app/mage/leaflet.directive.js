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
    trackResize: true,
    worldCopyJump: true
  });

  map.on('moveend', saveMapPosition);

  function saveMapPosition() {
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
      $scope.$emit('observation:latlng', latlng.wrap());
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

    if (!layers['EditObservation']) {
      var editObservationLayer = {
        name: 'EditObservation',
        group: 'MAGE',
        type: 'geojson',
        options: {
          selected: true
        }
      };
      MapService.createVectorLayer(editObservationLayer);
    }

    var newObservationLayer = {
      name: 'EditObservation',
      group: 'MAGE',
      type: 'geojson',
      options: {
        selected: true
      }
    };
    MapService.createVectorLayer(newObservationLayer);

    createGeoJsonForLayer(marker, layers['EditObservation'], true);
    layer = layers['EditObservation'].featureIdToLayer[marker.id];
    layers['EditObservation'].layer.addLayer(layer);
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

  function createGeoJsonForLayer(json, layerInfo, editMode) {
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

  var selectedVertex;

  function enableEditable(layer) {
    if (layers['EditObservation'] && layers['EditObservation'].featureIdToLayer[layer.feature.id]) return;

    layers['Observations'].layer.removeLayer(layer);
    if (!layers['EditObservation']) {
      var editObservationLayer = {
        name: 'EditObservation',
        group: 'MAGE',
        type: 'geojson',
        options: {
          selected: true
        }
      };
      MapService.createVectorLayer(editObservationLayer);
    }
    layers['EditObservation'].layer.addLayer(layer);
    layers['EditObservation'].featureIdToLayer[layer.feature.id] = layer;

    if (layer.feature.geometry.type === 'Point') {
      layer.setZIndexOffset(1000);

      layer.setIcon(L.fixedWidthIcon({
        iconUrl: layer.feature.style.iconUrl,
        tooltip: true,
        onIconLoad: function() {
          if (self._popup && self._icon) {
            self._popup.options.offset = [0, self._icon.offsetTop + 10];
            self._popup.update();
          }
        }
      }));

      layer.dragging.enable();
      layer.on('dragend', function(event) {
        $scope.$broadcast('observation:moved', layer.feature, event.target.toGeoJSON().geometry);
        $scope.$apply();
      });
    } else {
      if (!layer.feature.geometry.coordinates || layer.feature.geometry.coordinates.length === 0 || (layer.feature.geometry.coordinates.length === 1 && layer.feature.geometry.coordinates[0].length === 0)) {
        initiateShapeDraw(layer.feature.geometry.type === 'Polygon' ? 'Poly' : 'Line', layer);
      } else {
        initiateShapeEdit(layer);
      }
    }
  }

  function initiateShapeDraw(shapeType, layer) {
    map.pm.enableDraw(shapeType, {
      snappable: true,
      templineStyle: {
          color: 'blue',
      },
      hintlineStyle: {
          color: 'blue',
          dashArray: [5, 5],
      },
      pathOptions: {
          color: 'red',
          fillColor: 'orange',
          fillOpacity: 0.7,
      },
      cursorMarker: true,
      finishOnDoubleClick: true,
    });
    map.on('pm:create', function(event) {
      map.off('pm:create');
      map.pm.disableDraw(shapeType);
      var gj = event.layer.toGeoJSON();
      map.removeLayer(event.layer);
      gj.id = layer.feature.id;
      layers['EditObservation'].layer.removeLayer(layer);
      createGeoJsonForLayer(gj, layers['EditObservation'], true);
      var newLayer = layers['EditObservation'].featureIdToLayer[layer.feature.id];
      layers['EditObservation'].layer.addLayer(newLayer);
      newLayer.feature = layer.feature;
      newLayer.feature.geometry = gj.geometry;
      initiateShapeEdit(newLayer);
      $scope.$broadcast('observation:moved', newLayer.feature, newLayer.toGeoJSON().geometry);
      // $scope.$broadcast('observation:edit:vertex', newLayer.feature, gj.geometry, 0);
      $scope.$apply();
    });
  }

  function initiateShapeEdit(layer) {

    layer.pm.enable({
      draggable: true,
      snappable: false,
      clickListener: function(e) {
        var group = layer.pm._markerGroup;
        group.eachLayer(function(layer) {
          L.DomUtil.removeClass(layer.getElement(), 'selected-marker');
        });
        selectedVertex = e.target._index;
        L.DomUtil.addClass(e.target.getElement(), 'selected-marker');
        $scope.$broadcast('observation:edit:vertex', layer.feature, e.target.getLatLng(), e.target._index);
        $scope.$apply();
      }
    });

    selectedVertex = selectedVertex || 0;
    var group = layer.pm._markerGroup;
    group.eachLayer(function(layer) {
      if (layer._index === selectedVertex) {
        L.DomUtil.addClass(layer.getElement(), 'selected-marker');
      }
    });

    layer.on('pm:edit', function(event) {
      console.log('pm edit');
      $scope.$broadcast('observation:moved', layer.feature, event.target.toGeoJSON().geometry);
      $scope.$apply();
    });
    layer.on('pm:markerdragend', function(event) {
      console.log('pm marker drag end');
      var group = layer.pm._markerGroup;
      group.eachLayer(function(layer) {
        L.DomUtil.removeClass(layer.getElement(), 'selected-marker');
      });
      selectedVertex = event.markerEvent.target._index;
      L.DomUtil.addClass(event.markerEvent.target.getElement(), 'selected-marker');

      $scope.$broadcast('observation:edit:vertex', layer.feature, event.markerEvent.target.getLatLng(), event.markerEvent.target._index);
      $scope.$apply();
    });
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
      var groupName = 'Observations';
      var layer = layers[groupName].featureIdToLayer[edit.id];
      if (!layer && layers['EditObservation']) {
        groupName = 'EditObservation';
        layer = layers[groupName].featureIdToLayer[edit.id];
      }
      delete layers[groupName].featureIdToLayer[edit.id];
      layers[groupName].layer.removeLayer(layer);
      enableEditable(layer);
    });

    _.each(changed.editComplete, function(editComplete) {
      var layer = layers['EditObservation'].featureIdToLayer[editComplete.id];

      if (layer.pm.enabled()) {
        layer.pm.disable();
      }
      if (layer.dragging) {
        layer.dragging.disable();
      }
      layers['EditObservation'].layer.removeLayer(layer);
      delete layers['EditObservation'].featureIdToLayer[editComplete.id];
      createGeoJsonForLayer(editComplete, layers['Observations']);
      layer = layers['Observations'].featureIdToLayer[editComplete.id];
      layers['Observations'].layer.addLayer(layer);
    });

    _.each(changed.updateIcon, function(updateIcon) {
      if (updateIcon.marker.geometry.type !== 'Point') return;
      var groupName = 'Observations';
      var layer = layers[groupName].featureIdToLayer[updateIcon.id];
      if (!layer && layers['NewObservation']) {
        groupName = 'NewObservation';
        layer = layers[groupName].featureIdToLayer[updateIcon.id];
      } else if (!layer && layers['EditObservation']) {
        groupName = 'EditObservation';
        layer = layers[groupName].featureIdToLayer[updateIcon.id];
      }
      if (!layer) {
        return;
      }
      var feature = JSON.parse(JSON.stringify(layer.feature));
      feature.geometry = updateIcon.marker.geometry;
      feature.style.iconUrl = updateIcon.iconUrl;
      if (layer.pm.enabled()) {
        layer.pm.disable();
      }
      layers[groupName].layer.removeLayer(layer);
      delete layers[groupName].featureIdToLayer[updateIcon.id];
      createGeoJsonForLayer(feature, layers[groupName], true);
      layer = layers[groupName].featureIdToLayer[updateIcon.id];
      layers[groupName].layer.addLayer(layer);
      layer.setZIndexOffset(1000);

      layer.dragging.enable();
      layer.on('dragend', function(event) {
        $scope.$broadcast('observation:moved', layer.feature, event.target.toGeoJSON().geometry);
        $scope.$apply();
      });
    });

    _.each(changed.updateShapeType, function(updateShapeType) {
      var groupName = 'EditObservation';
      var layer = layers[groupName].featureIdToLayer[updateShapeType.id];
      if (!layer && layers['NewObservation']) {
        groupName = 'NewObservation';
        layer = layers[groupName].featureIdToLayer[updateShapeType.id];
      }
      if (!layer) {
        return;
      }

      if (updateShapeType.marker.geometry.type === layer.feature.geometry.type) {
        // update the shape coordinates
        if (layer.feature.geometry.coordinates && !_.isEqual(updateShapeType.marker.geometry.coordinates, layer.feature.geometry.coordinates)) {
          try {
            if(layer.feature.geometry.type === 'Point'){
              layer.setLatLng(L.GeoJSON.coordsToLatLng(updateShapeType.marker.geometry.coordinates));
              // // TODO fix, this is showing accuracy when a new location comes in.
              // // this should only happen when the popup is openPopup
              // if (featureLayer.options.showAccuracy && layer._popup._isOpen  && layer.getAccuracy()) {
              //   layer.setAccuracy(layer.feature.properties.accuracy);
              // }
            } else {
              var geojson = L.GeoJSON.coordsToLatLngs(updateShapeType.marker.geometry.coordinates, updateShapeType.marker.geometry.type === 'Polygon' ? 1 : 0);
              layer.setLatLngs(geojson);
              layer.off('pm:markerdragend');
              layer.off('pm:edit');
              layer.pm.disable();
              initiateShapeEdit(layer);
            }
          } catch (e) {
            console.log('exception setting lat lngs', e);
          }
        }
      } else {

        map.pm.disableDraw(layer.feature.geometry.type === 'Polygon' ? 'Poly' : 'Line');

        layers[groupName].layer.removeLayer(layer);
        if (layer.pm) {
          layer.pm.disable();
          layer.off('pm:markerdragend');
          layer.off('pm:edit');
        } else {
          layer.off('dragend');
          layer.dragging.disable();
        }

        if (updateShapeType.marker.geometry.type === 'Point') {
          var center = map.getCenter();
          updateShapeType.marker.geometry.coordinates = [center.lng, center.lat];
          var feature = layer.feature;
          feature.geometry = updateShapeType.marker.geometry;
          createGeoJsonForLayer(feature, layers[groupName], true);
          layer = layers[groupName].featureIdToLayer[updateShapeType.id];
          layers[groupName].layer.addLayer(layer);
          layer.setZIndexOffset(1000);

          layer.dragging.enable();
          layer.on('dragend', function(event) {
            $scope.$broadcast('observation:moved', layer.feature, event.target.toGeoJSON().geometry);
            $scope.$apply();
          });

          $scope.$broadcast('observation:moved', layer.feature, layer.toGeoJSON().geometry);
        } else {
          var feature = layer.feature;
          feature.geometry = updateShapeType.marker.geometry;
          initiateShapeDraw(updateShapeType.marker.geometry.type === 'Polygon' ? 'Poly' : 'Line', layer);
        }
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
        featureLayer.layer.removeLayer(layer);
        featureLayer.layer.addLayer(createGeoJsonForLayer(feature, featureLayer));
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
