var L = require('leaflet')
  , mgrs= require('mgrs')
  , MDCTextField = require('material-components-web').textField.MDCTextField
  , MageFeatureEdit = require('../../leaflet-extensions/FeatureEdit')
  , angular = require('angular');

module.exports = {
  template: require('./location-edit.component.html'),
  bindings: {
    field: '<',
    geometryStyle: '<',
    clearable: '<',
    onFieldChanged: '&',
    cancelEdit: '&',
    saveEdit: '&'
  },
  controller: LocationEditController
};

LocationEditController.$inject = ['$element', '$timeout', 'MapService', 'GeometryService', 'LocalStorageService'];

function LocationEditController($element, $timeout, MapService, GeometryService, LocalStorageService) {
  var layers = {};
  var map;

  this.valid = {
    mgrs: true
  };

  this.coordinateSystem = LocalStorageService.getCoordinateSystemEdit();

  this.coordinateSystemChange = function(coordinateSystem) {
    LocalStorageService.setCoordinateSystemEdit(coordinateSystem);
    this.coordinateSystem = coordinateSystem;
    if (coordinateSystem === 'mgrs') {
      this.mgrs = this.toMgrs(this.field);
    }
    $timeout(function() {
      this.initializeTextFields();
      this.setFieldValues();
    }.bind(this));  
  };

  this.toMgrs = function(field) {
    switch (this.shape.type) {
    case 'Point':
      return mgrs.forward(field.value.coordinates);
    case 'LineString':
      return mgrs.forward(field.value.coordinates[this.selectedVertexIndex]);
    case 'Polygon':
      return mgrs.forward(field.value.coordinates[0][this.selectedVertexIndex]);
    }
  };

  this.saveLocation = function() {
    this.saveEdit({value: this.currentGeometry.geometry});
  };

  this.clearLocation = function() {
    this.saveEdit({value: undefined});
  };
    
  this.cancel = function() {
    MapService.removeListener(this.mapListener);
    this.cancelEdit();
  };
  this.$postLink = function() {
    map = L.map($element.find('.map-container')[0], {
      center: [0,0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: true,
      attributionControl: false,
      editable: true
    });

    this.mapListener = {
      onBaseLayerSelected: onBaseLayerSelected
    };
    MapService.addListener(this.mapListener);
    this.currentGeometry = {
      geometry: this.shape
    };

    this.featureEdit = new MageFeatureEdit(map, MapService, GeometryService, this.geometryChangedListener.bind(this), this.vertexClickListener.bind(this));
    
    function onBaseLayerSelected(baseLayer) {
      var layer = layers[baseLayer.name];
      if (layer) map.removeLayer(layer.layer);
    
      layer = createRasterLayer(baseLayer);
      layers[baseLayer.name] = {type: 'tile', layer: baseLayer, rasterLayer: layer};
    
      layer.addTo(map);
    }
    
    function createRasterLayer(layer) {
      var baseLayer = null;
      var options = {};
      if (layer.format === 'XYZ' || layer.format === 'TMS') {
        options = { tms: layer.format === 'TMS', maxZoom: 18 };
        baseLayer = new L.TileLayer(layer.url, options);
      } else if (layer.format === 'WMS') {
        options = {
          layers: layer.wms.layers,
          version: layer.wms.version,
          format: layer.wms.format,
          transparent: layer.wms.transparent
        };
    
        if (layer.wms.styles) options.styles = layer.wms.styles;
        baseLayer = new L.TileLayer.WMS(layer.url, options);
      }
    
      return baseLayer;
    }
    this.editingFeature = this.addObservation({type: 'Feature', geometry: this.shape, style: this.geometryStyle});

    this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
  };

  this.onLatLngChange = function() {
    var coordinates = angular.copy(this.shape.coordinates);

    // copy edit field lat/lng in coordinates at correct index
    if (this.shape.type === 'LineString') {
      coordinates[this.selectedVertexIndex] = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
    } else if (this.shape.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.selectedVertexIndex] = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
      }
    }
  
    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.field, coordinates);
  
    // Check for polygon for intersections
    if (this.hasIntersections(this.field, coordinates)) {
      return;
    }
  
    this.shape.coordinates = coordinates;
    this.featureEdit.stopEdit();
    this.editingFeature = this.addObservation({type: 'Feature', geometry: this.shape, style: this.geometryStyle});

    this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
  };

  this.onMgrsChange = function() {
    try {
      this.toLatLng(this.mgrs, this.field);
      this.valid.mgrs = true;
      this.mgrsField.valid = true;
    } catch(e) {
      this.mgrsField.valid = false;
      this.valid.mgrs = false;
    }
  };

  this.toLatLng = function(mgrsString, field) {
    var coordinates = angular.copy(field.value.coordinates);
  
    switch (field.value.type) {
    case 'Point':
      coordinates = mgrs.toPoint(mgrsString);
      break;
    case 'LineString':
      coordinates[this.selectedVertexIndex] = mgrs.toPoint(mgrsString);
      break;
    case 'Polygon':
      coordinates[0][this.selectedVertexIndex] = mgrs.toPoint(mgrsString);
      break;
    }

    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.field, coordinates);
  
    // Check for polygon for intersections
    if (this.hasIntersections(this.field, coordinates)) {
      return;
    }

    this.shape.coordinates = coordinates;
    this.featureEdit.stopEdit();
    this.editingFeature = this.addObservation({type: 'Feature', geometry: this.shape, style: this.geometryStyle});

    this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
  };

  this.hasIntersections = function(field, coordinates) {
    if (field.value.type !== 'Point') {
      if (GeometryService.featureHasIntersections({geometry: {coordinates: coordinates}})) {
        if (field.value.type === 'LineString') { // Is it ok for line string to intersect
          field.edit = angular.copy(field.value.coordinates[this.selectedVertexIndex]);
        } else if (field.value.type === 'Polygon') {
          if (field.value.coordinates[0]) {
            field.edit = angular.copy(field.value.coordinates[0][this.selectedVertexIndex]);
          }
        }
  
        return true;
      }
    }
  
    return false;
  };

  this.toGeoJSON = function(field, coordinates) {
    // Ensure first and last points are the same for polygon
    if (field.value.type === 'Polygon') {
      if (field.editedVertex === 0) {
        coordinates[0][coordinates[0].length - 1] = coordinates[0][0];
      } else if (field.editedVertex === coordinates[0].length - 1) {
        coordinates[0][0] = coordinates[0][coordinates[0].length - 1];
      }
    }
  };

  this.vertexClickListener = function(vertex) {
    $timeout(function() {
      this.selectedVertexIndex = vertex.getIndex();
      this.selectedVertex = [vertex.latlng.lng, vertex.latlng.lat];
      this.mgrs = mgrs.forward(this.selectedVertex);
      this.valid.mgrs = true;
      this.setFieldValues();
    }.bind(this));
  };

  this.setFieldValues = function() {
    if (this.latitudeField) {
      this.longitudeField.value = this.selectedVertex[0];
      this.latitudeField.value = this.selectedVertex[1];
    }
    if (this.mgrsField) {
      this.mgrsField.value = this.mgrs;
      this.valid.mgrs = true;
    }
  };

  this.geometryChangedListener = function(geometry) {
    $timeout(function() {
      this.currentGeometry.geometry = geometry;
      this.shape = geometry;
      this.updateSelectedVertex();
    }.bind(this));
  };

  this.addObservation = function(feature) {
    if(feature.geometry){
      if(feature.geometry.type === 'Point'){
        var observation = L.geoJson(feature, {
          pointToLayer: function (feature, latlng) {
            return L.fixedWidthMarker(latlng, {
              iconUrl: this.geometryStyle ? this.geometryStyle.iconUrl : ''
            });
          }.bind(this)
        });
        observation.addTo(map);
        map.setView(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), 15);
        return observation.getLayers()[0];
      } else {
        observation = L.geoJson(feature, {
          style: function() {
            return this.geometryStyle;
          }
        });
        observation.addTo(map);
  
        var coordinates = feature.geometry.coordinates;
        if(feature.geometry.type === 'Polygon'){
          coordinates = coordinates[0];
        }
        map.fitBounds(L.latLngBounds(L.GeoJSON.coordsToLatLngs(coordinates)));
        return observation.getLayers()[0];
      }
    }
  };

  this.validateShapeChange = function() {
    if (!this.shape || !this.shape.type || this.shape.type === this.value.type) return;
  
    switch(this.shape.type) {
    case 'Point':
      this.value.coordinates = [];
      this.value.type = 'Point';
      break;
    case 'LineString':
      this.value.coordinates = [];
      this.value.type = 'LineString';
      break;
    case 'Polygon':
      this.value.coordinates = [[]];
      this.value.type = 'Polygon';
      break;
    }
  
    this.value.type = this.shape.type;
  };

  this.shapeTypeChanged = function(shapeType) {
    this.shape.type = shapeType;
    this.validateShapeChange();
    this.onEditShape();
  };

  this.onEditShape = function() {
    if(!this.editingFeature) return;
    this.featureEdit.stopEdit();
  
    if (this.shape.type === 'Point') {
      var center = map.getCenter();
      this.value.coordinates = [center.lng, center.lat];
      this.editingFeature = this.addObservation({type: 'Feature', geometry: this.value, style: this.geometryStyle});
      this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
    } else {
      this.featureEdit.initiateShapeDraw({type: 'Feature', geometry: this.value, style: this.geometryStyle});
    }
  };

  this.$onChanges = function() {
    this.shape = angular.copy(this.field.value);
    this.value = angular.copy(this.field.value);
    this.selectedVertexIndex = 0;
    this.mgrs = this.toMgrs(this.field);
    this.updateSelectedVertex();
    this.initializeTextFields();
  };

  this.updateSelectedVertex = function() {
    if (this.shape.type === 'Point') {
      this.selectedVertex = [this.shape.coordinates[0], this.shape.coordinates[1]];
    } else if (this.shape.type === 'Polygon') {
      this.selectedVertex = [this.shape.coordinates[0][this.selectedVertexIndex][0], this.shape.coordinates[0][this.selectedVertexIndex][1]];
    } else if (this.shape.type === 'LineString') {
      this.selectedVertex = [this.shape.coordinates[this.selectedVertexIndex][0], this.shape.coordinates[this.selectedVertexIndex][1]];
    }
  };

  this.initializeTextFields = function() {
    if (!this.latitudeField && this.coordinateSystem === 'wgs84') {
      $timeout(function() {
        this.latitudeField = new MDCTextField($element.find('.latitude-text-field')[0]);
        this.longitudeField = new MDCTextField($element.find('.longitude-text-field')[0]);
        this.longitudeField.value = this.selectedVertex[0];
        this.latitudeField.value = this.selectedVertex[1];
      }.bind(this));
    } else if (!this.mgrsField && this.coordinateSystem === 'mgrs') {
      $timeout(function() {
        this.mgrsField = new MDCTextField($element.find('.mgrs-text-field')[0]);
        this.mgrsField.useNativeValidation = false;
          
        this.mgrsField.value = this.mgrs;
        this.mgrsField.valid = true;
      }.bind(this));
    }
  };
}