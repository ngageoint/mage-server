// const MDCTextField = require('material-components-web').textField.MDCTextField;
var L = require('leaflet')
  , MageFeatureEdit = require('../../leaflet-extensions/FeatureEdit');

module.exports = {
  template: require('./location-edit.component.html'),
  bindings: {
    field: '<',
    geometryStyle: '<',
    onFieldChanged: '&',
    cancelEdit: '&',
    saveEdit: '&'
  },
  controller: function($element, $timeout, MapService, GeometryService) {
    var layers = {};
    var map;

    this.saveLocation = function() {
      this.saveEdit({
        value: this.featureEdit.newGeometry
      })
    }
    
    this.cancel = function() {
      MapService.removeListener(this.mapListener);
      this.cancelEdit()
    }
    this.$postLink = function() {
      // this.textField = new MDCTextField($element.find('.mdc-text-field')[0]);
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

      this.featureEdit = new MageFeatureEdit(map, MapService, GeometryService);
    
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
      this.editingFeature = this.addObservation({type: 'Feature', geometry: this.field.value, style: this.geometryStyle})

      this.featureEdit.startEdit(this.editingFeature)
    }

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
          var observation = L.geoJson(feature, {
            style: function(feature) {
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
    }

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
      this.onEditShape()
    }

    this.onEditShape = function() {
      if(!this.editingFeature) return;
      this.featureEdit.stopEdit();
  
      if (this.shape.type === 'Point') {
        var center = map.getCenter();
        this.value.coordinates = [center.lng, center.lat];
        this.editingFeature = this.addObservation({type: 'Feature', geometry: this.value, style: this.geometryStyle});
        this.featureEdit.startEdit(this.editingFeature)
        // var feature = layer.feature;
        // feature.geometry = edit.feature.geometry;
        // createGeoJsonForLayer(this.value, layers['Edit'], true);
        // layer = layers['Edit'].featureIdToLayer[edit.feature.id];
        // layers['Edit'].layer.addLayer(layer);
        // this.editingFeature.setZIndexOffset(1000);
  
        // this.editingFeature.dragging.enable();
        // this.editingFeature.on('dragend', function(event) {
        //   $scope.$broadcast('feature:moved', layer.feature, event.target.toGeoJSON().geometry);
        //   $scope.$apply();
        // });
  
        // $scope.$broadcast('feature:moved', layer.feature, layer.toGeoJSON().geometry);
      } else {
        this.featureEdit.initiateShapeDraw({type: 'Feature', geometry: this.value, style: this.geometryStyle});
      }
    }

    this.initiateShapeDraw = function(feature) {

    }

    this.$onChanges = function() {
      this.shape = angular.copy(this.field.value)
      this.value = angular.copy(this.field.value)
    }
  }
};