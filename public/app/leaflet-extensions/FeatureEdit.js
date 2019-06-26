var L = require('leaflet');

MageFeatureEdit.prototype.createEditLayer = function() {
  var editObservationLayer = {
    name: 'Edit',
    group: 'MAGE',
    type: 'geojson',
    options: {
      selected: true
    },
    featureIdToLayer: {}
  };

  this.editLayer = L.geoJson(null, {
    onEachFeature: function(feature, layer) {
      editObservationLayer.featureIdToLayer[feature.id] = layer;
    },
    pointToLayer: function (feature, latlng) {
      var options = {};
      if (feature.style && feature.style.iconUrl) {
        options.iconUrl = feature.style.iconUrl;
      }
      options.tooltip = editMode;
      return L.fixedWidthMarker(latlng, options);
    },
    style: function(feature) {
      return feature.style;
    }
  })

  editObservationLayer.layer = this.editLayer;
  this.editLayer.addTo(this.map)


  // this.MapService.createVectorLayer(editObservationLayer);
  // this.MapService.addListener({
  //   onEdit: this.onEdit.bind(this)
  // })
}

MageFeatureEdit.prototype.stopEdit = function() {
  this.editedFeature.disableEdit();
  this.map.removeLayer(this.editedFeature);

  this.editLayer.removeLayer(this.editedFeature);
  this.editedFeature = undefined;
}

MageFeatureEdit.prototype.startEdit = function(layerToEdit) {
  if (this.editedFeature) {
    return;
  }
  this.editedFeature = layerToEdit;
  this.editLayer.addLayer(layerToEdit);
  if (layerToEdit.feature.geometry.type === 'Point') {
    layerToEdit.setZIndexOffset(1000);

    layerToEdit.setIcon(L.fixedWidthIcon({
      iconUrl: layerToEdit.feature.style.iconUrl,
      tooltip: true
    }));

    layerToEdit.dragging.enable();
    layerToEdit.on('dragend', function(event) {
      console.log('dragend', event)
      this.newGeometry = event.target.toGeoJSON().geometry;
      console.log('newGeometry', this.newGeometry)
      // $scope.$broadcast('feature:moved', layer.feature, event.target.toGeoJSON().geometry);
      // $scope.$apply();
    }.bind(this));
  } else {
    this.initiateShapeEdit(layerToEdit);
  }
}

MageFeatureEdit.prototype.initiateShapeDraw = function(feature) {
  this.editedFeature = feature.geometry.type === 'Polygon' ? this.map.editTools.startPolygon() : this.map.editTools.startPolyline();
  // this.editedFeature.feature = feature;
  // layers['Edit'].featureIdToLayer[feature.id] = editLayer;

  this.editedFeature.on('editable:drawing:commit', function(e) {
    console.log('drawing commit', e)
    // e.layer.disableEdit();
    // map.removeLayer(e.layer);

    // var geojson = e.layer.toGeoJSON();
    // geojson.id = editLayer.feature.id;

    // createGeoJsonForLayer(geojson, layers['Edit'], true);
    // var newLayer = layers['Edit'].featureIdToLayer[geojson.id];
    // layers['Edit'].layer.addLayer(newLayer);

    // initiateShapeEdit(newLayer);

    // $scope.$broadcast('feature:moved', newLayer.feature, geojson.geometry);
    // $scope.$apply();
    this.newGeometry = e.layer.toGeoJSON().geometry;
    console.log('commited the drawing', this.newGeometry)
  }.bind(this));

  this.editedFeature.on('editable:vertex:contextmenu', function(e) {
    // delete on right click
    if (this.editedFeature.editor.vertexCanBeDeleted(e.vertex)) {
      e.vertex.delete();
    }
  }.bind(this));

  this.editedFeature.on('editable:vertex:rawclick', function(e) {
    // don't delete on click
    e.cancel();
  });

  this.editedFeature.on('editable:drawing:clicked', function() {
    if (this.GeometryService.featureHasIntersections(this.editedFeature.toGeoJSON())) {
      this.editedFeature.editor.pop();
    }
  }.bind(this));
}

MageFeatureEdit.prototype.initiateShapeEdit = function(layer) {
  layer.enableEdit();
  layer.selectedVertex = layer.editor.editLayer.getLayers()[0];
  L.DomUtil.addClass(layer.selectedVertex.getElement(), 'selected-marker');

  geometryChanged = function(e) {
    this.value = e.layer.toGeoJSON().geometry
    // $scope.$broadcast('feature:moved', e.layer.feature, e.layer.toGeoJSON().geometry);
    // $scope.$apply();
  }.bind(this)

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

    // $scope.$broadcast('mage:map:edit:vertex', layer.feature, layer.toGeoJSON().geometry, e.vertex.getIndex());
    // $scope.$apply();
  }.bind(this));

  var previousLatLngs;
  layer.on('editable:vertex:dragstart', function(e) {
    layer.selectedVertex = e.vertex;
    previousLatLngs = angular.copy(layer.getLatLngs());
  });

  layer.on('editable:vertex:dragend', function(e) {
    selectVertex(e.vertex);

    if (this.GeometryService.featureHasIntersections(layer.toGeoJSON()) && previousLatLngs) {
      layer.setLatLngs(previousLatLngs);
      layer.editor.reset();

      layer.editor.editLayer.eachLayer(function(l) {
        if (l.getIndex && l.getIndex() === layer.selectedVertex.getIndex()) {
          L.DomUtil.addClass(l.getElement(), 'selected-marker');
        }
      });

      return;
    }
    this.newGeometry = layer.toGeoJSON().geometry
    // $scope.$broadcast('mage:map:edit:vertex', layer.feature, layer.toGeoJSON().geometry, e.vertex.getIndex());
    // $scope.$apply();
  }.bind(this));
}

function MageFeatureEdit(map, MapService, GeometryService) {
  this.map = map;
  this.MapService = MapService;
  this.GeometryService = GeometryService;
  this.createEditLayer();
}

module.exports = MageFeatureEdit;