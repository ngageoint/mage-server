import angular from 'angular';
import {select} from 'material-components-web';

class GeometryEditController {

  constructor($element, $timeout, GeometryService, LocalStorageService) {
    this._$element = $element;
    this._$timeout = $timeout;
    this._GeometryService = GeometryService;
    this._LocalStorageService = LocalStorageService;

    this.shapes = [{
      display: 'Point',
      value: 'Point'
    },{
      display: 'Line',
      value: 'LineString'
    },{
      display: 'Polygon',
      value: 'Polygon'
    }];

    this.shape = {
      type: 'Point'
    };

    this.coordinateSystem = LocalStorageService.getCoordinateSystemEdit();
  }

  $postLink() {
    this.initializeDropDown();
  }

  $doCheck() {
    if (!this.field.value && this.select) {
      this.select.selectedIndex = -1;
    }
  }

  startGeometryEdit(field) {
    this.editLocationField = angular.copy(field);
    this.editGeometryStyle = this.geometryStyle;
    this.scrollTop = this._$element[0].closest('.feed-scroll').scrollTop;
    this._$element[0].closest('.feed-scroll').scrollTop = 0;
    this._$element[0].closest('.feed-scroll').style['overflow-y'] = 'hidden';
  }

  saveLocationEdit(value) {
    this.field.value = value;
    this.editLocationField = undefined;
    this._$element[0].closest('.feed-scroll').scrollTop = this.scrollTop;
    this._$element[0].closest('.feed-scroll').style['overflow-y'] = 'auto';
  }

  cancelLocationEdit() {
    this.editLocationField = undefined;
    this._$element[0].closest('.feed-scroll').scrollTop = this.scrollTop;
    this._$element[0].closest('.feed-scroll').style['overflow-y'] = 'auto';
  }

  editGeometry(event) {
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
    const mapPos = this._LocalStorageService.getMapPosition();
    this.field.value = this.field.value || {type: 'Point', coordinates: [mapPos.center.lng, mapPos.center.lat]};
    this.startGeometryEdit(this.field);
    this.select.selectedIndex = 0;
  }

  initializeDropDown() {
    this._$timeout(() => {
      if (!this.select) {
        this.select = new select.MDCSelect(this._$element.find('.mdc-select')[0]);
      }
      if (this.field.value && this.field.value.coordinates.length) {
        this.select.selectedIndex = 0;
        this.select.value = " ";
      }
    });
  }
}

GeometryEditController.$inject = ['$element', '$timeout', 'GeometryService', 'LocalStorageService'];

const GeometryEdit = {
  template: require('./geometry.edit.html'),
  bindings: {
    form: '<',
    field: '<',
    geometryStyle: '<',
    onFieldChanged: '&',
    onShapeChanged: '&'
  },
  controller: GeometryEditController
};

export default GeometryEdit;
