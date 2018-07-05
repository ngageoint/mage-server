var _ = require('underscore')
  , L = require('leaflet')
  , angular = require('angular')
  , moment = require('moment')
  , geosearch = require('leaflet-geosearch');

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
require('leaflet-groupedlayercontrol/src/leaflet.groupedlayercontrol.js');
require('leaflet.markercluster');

LeafletController.$inject = ['$rootScope', '$scope', '$interval', '$timeout', 'MapService', 'LocalStorageService', 'GeometryService'];

function LeafletController($rootScope, $scope, $interval, $timeout, MapService, LocalStorageService, GeometryService) {

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

  map.on('moveend', saveMapPosition);

  function saveMapPosition() {
    LocalStorageService.setMapPosition({
      center: map.getCenter(),
      zoom: map.getZoom()
    });
  }

  // toolbar  and controls config
  new geosearch.GeoSearchControl({
    provider: new geosearch.OpenStreetMapProvider(),
    showMarker: false,
    autoClose: true
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

  var layerControl = L.control.groupedLayers([], [], {
    autoZIndex: false,
    collapsed: false
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

  // Edit layer, houses features that are being created or modified
  createGeoJsonLayer({
    name: 'Edit',
    type: 'geojson',
    options: {
      selected: true,
      hidden: true
    }
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
    onCreate: onCreate,
    onEdit: onEdit,
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

    if (data.options.selected) layerInfo.layer.addTo(map);

    if (!data.options.hidden) {
      layerControl.addOverlay(layerInfo.layer, data.name, data.group);
    }
  }

  function onEdit(edit) {
    switch(edit.type) {
    case 'start':
      onEditStarted(edit);
      break;
    case 'geometry':
      onEditGeometry(edit);
      break;
    case 'shape':
      onEditShape(edit);
      break;
    case 'icon':
      onEditIcon(edit);
      break;
    case 'complete':
    case 'delete':
      onEditComplete(edit);
      break;
    }
  }

  function onEditStarted(edit) {
    var layer = layers[edit.name].featureIdToLayer[edit.feature.id];
    delete layers[edit.name].featureIdToLayer[edit.feature.id];
    layers[edit.name].layer.removeLayer(layer);

    if (layers['Edit'].featureIdToLayer[layer.feature.id]) return;

    layers['Observations'].layer.removeLayer(layer);

    layers['Edit'].layer.addLayer(layer);
    layers['Edit'].featureIdToLayer[layer.feature.id] = layer;

    if (layer.feature.geometry.type === 'Point') {
      layer.setZIndexOffset(1000);

      layer.setIcon(L.fixedWidthIcon({
        iconUrl: layer.feature.style.iconUrl,
        tooltip: true
      }));

      layer.dragging.enable();
      layer.on('dragend', function(event) {
        $scope.$broadcast('feature:moved', layer.feature, event.target.toGeoJSON().geometry);
        $scope.$apply();
      });
    } else {
      initiateShapeEdit(layer);
    }
  }

  function onEditGeometry(edit) {
    var feature = edit.feature;
    var layer = layers['Edit'].featureIdToLayer[feature.id];
    if (!layer) {
      return;
    }

    // update the shape coordinates
    if (layer.feature.geometry.coordinates && !_.isEqual(feature.geometry.coordinates, layer.feature.geometry.coordinates)) {
      if (layer.feature.geometry.type === 'Point') {
        layer.setLatLng(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates));
      } else {
        var geojson = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates, feature.geometry.type === 'Polygon' ? 1 : 0);
        layer.setLatLngs(geojson);
        layer.editor.reset();

        // preserve selected marker
        layer.editor.editLayer.eachLayer(function(l) {
          if (l.getIndex && l.getIndex() === layer.selectedVertex.getIndex()) {
            L.DomUtil.addClass(l.getElement(), 'selected-marker');
          }
        });
      }
    }
  }

  function onEditShape(edit) {
    var layer = layers['Edit'].featureIdToLayer[edit.feature.id];
    if (!layer) {
      return;
    }

    layer.disableEdit();
    map.removeLayer(layer);
    layers['Edit'].layer.removeLayer(layer);

    if (edit.feature.geometry.type === 'Point') {
      var center = map.getCenter();
      edit.feature.geometry.coordinates = [center.lng, center.lat];
      var feature = layer.feature;
      feature.geometry = edit.feature.geometry;
      createGeoJsonForLayer(feature, layers['Edit'], true);
      layer = layers['Edit'].featureIdToLayer[edit.feature.id];
      layers['Edit'].layer.addLayer(layer);
      layer.setZIndexOffset(1000);

      layer.dragging.enable();
      layer.on('dragend', function(event) {
        $scope.$broadcast('feature:moved', layer.feature, event.target.toGeoJSON().geometry);
        $scope.$apply();
      });

      $scope.$broadcast('feature:moved', layer.feature, layer.toGeoJSON().geometry);
    } else {
      initiateShapeDraw(edit.feature);
    }
  }

  function onEditIcon(edit) {
    var feature = edit.feature;
    if (feature.geometry.type !== 'Point') return;

    var layer = layers['Edit'].featureIdToLayer[feature.id];
    if (!layer) {
      return;
    }

    layer.feature.style = {
      iconUrl: edit.iconUrl
    };

    layer.setIcon(L.fixedWidthIcon({
      iconUrl: layer.feature.style.iconUrl,
      tooltip: true
    }));
  }

  function onEditComplete(edit) {
    var feature = edit.feature;

    var layer = layers['Edit'].featureIdToLayer[feature.id];
    layer.disableEdit();

    layers['Edit'].layer.removeLayer(layer);
    delete layers['Edit'].featureIdToLayer[feature.id];

    if (edit.type === 'complete') {
      // We removed the marker and substitued an editable marker.
      // Lets put back the non editable marker.
      createGeoJsonForLayer(feature, layers['Observations']);
      layer = layers['Observations'].featureIdToLayer[feature.id];
      layers['Observations'].layer.addLayer(layer);
    }
  }

  function onCreate(create) {
    switch(create.type) {
    case 'start':
      onCreateStarted(create);
      break;
    case 'complete':
      onCreateComplete(create);
      break;
    }
  }

  function onCreateStarted(create) {
    var feature = create.feature;

    if (feature.geometry.type === 'Point') {
      createGeoJsonForLayer(feature, layers['Edit'], true);
      var layer = layers['Edit'].featureIdToLayer['new'];
      layers['Edit'].layer.addLayer(layer);

      layer.dragging.enable();
      layer.on('dragend', function(event) {
        $scope.$broadcast('feature:moved', layer.feature, event.target.toGeoJSON().geometry);
        $scope.$apply();
      });
    } else {
      initiateShapeDraw(layer.feature);
    }
  }

  function onCreateComplete() {
    var layer = layers['Edit'].featureIdToLayer['new'];
    layer.disableEdit();

    layers['Edit'].layer.removeLayer(layer);
    delete layers['Edit'].featureIdToLayer['new'];
  }

  function initiateShapeDraw(feature) {
    var editLayer = feature.geometry.type === 'Polygon' ? map.editTools.startPolygon() : map.editTools.startPolyline();
    editLayer.feature = feature;
    layers['Edit'].featureIdToLayer[feature.id] = editLayer;

    editLayer.on('editable:drawing:commit', function(e) {
      e.layer.disableEdit();
      map.removeLayer(e.layer);

      var geojson = e.layer.toGeoJSON();
      geojson.id = editLayer.feature.id;

      createGeoJsonForLayer(geojson, layers['Edit'], true);
      var newLayer = layers['Edit'].featureIdToLayer[geojson.id];
      layers['Edit'].layer.addLayer(newLayer);

      initiateShapeEdit(newLayer);

      $scope.$broadcast('feature:moved', newLayer.feature, geojson.geometry);
      $scope.$apply();
    });

    editLayer.on('editable:vertex:contextmenu', function(e) {
      // delete on right click
      if (editLayer.editor.vertexCanBeDeleted(e.vertex)) {
        e.vertex.delete();
      }
    });

    editLayer.on('editable:vertex:rawclick', function(e) {
      // don't delete on click
      e.cancel();
    });

    editLayer.on('editable:drawing:clicked', function() {
      if (GeometryService.featureHasIntersections(editLayer.toGeoJSON())) {
        editLayer.editor.pop();
      }
    });
  }

  function initiateShapeEdit(layer) {
    layer.enableEdit();
    layer.selectedVertex = layer.editor.editLayer.getLayers()[0];
    L.DomUtil.addClass(layer.selectedVertex.getElement(), 'selected-marker');

    function geometryChanged(e) {
      $scope.$broadcast('feature:moved', e.layer.feature, e.layer.toGeoJSON().geometry);
      $scope.$apply();
    }

    function selectVertex(vertex) {
      layer.editor.editLayer.eachLayer(function(layer) {
        L.DomUtil.removeClass(layer.getElement(), 'selected-marker');
      });

      L.DomUtil.addClass(vertex.getElement(), 'selected-marker');
      layer.selectedVertex = vertex;
    }

    layer.on('editable:vertex:new', geometryChanged);
    layer.on('editable:vertex:deleted', geometryChanged);

    layer.on('editable:vertex:contextmenu', function(e) {
      var marker = e.vertex;
      if (layer.editor.vertexCanBeDeleted(marker)) {
        marker.delete();
      }
    });

    layer.on('editable:vertex:rawclick', function(e) {
      e.cancel(); // turn of delete when clicking a vertex
      selectVertex(e.vertex);

      $scope.$broadcast('mage:map:edit:vertex', layer.feature, layer.toGeoJSON().geometry, e.vertex.getIndex());
      $scope.$apply();
    });

    var previousLatLngs;
    layer.on('editable:vertex:dragstart', function(e) {
      layer.selectedVertex = e.vertex;
      previousLatLngs = angular.copy(layer.getLatLngs());
    });

    layer.on('editable:vertex:dragend', function(e) {
      selectVertex(e.vertex);

      if (GeometryService.featureHasIntersections(layer.toGeoJSON()) && previousLatLngs) {
        layer.setLatLngs(previousLatLngs);
        layer.editor.reset();

        layer.editor.editLayer.eachLayer(function(l) {
          if (l.getIndex && l.getIndex() === layer.selectedVertex.getIndex()) {
            L.DomUtil.addClass(l.getElement(), 'selected-marker');
          }
        });

        return;
      }

      $scope.$broadcast('mage:map:edit:vertex', layer.feature, layer.toGeoJSON().geometry, e.vertex.getIndex());
      $scope.$apply();
    });
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
