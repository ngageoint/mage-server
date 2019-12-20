import angular from 'angular';
import {select} from 'material-components-web';

class GeometryEditController {

  constructor($element, $timeout, MapService, LocalStorageService) {
    this.$element = $element;
    this.$timeout = $timeout;
    this.MapService = MapService;
    this.LocalStorageService = LocalStorageService;

    this.edit = false;
  }

  $postLink() {
    this._initializeDropDown();
  }

  $doCheck() {
    if (!this.feature && this.select) {
      this.select.selectedIndex = -1;
    }
  }

  startGeometryEdit() {
    this.edit = true;

    if (this.feature.geometry) {
      this.editFeature = angular.copy(this.feature);
    } else {
      const mapPosition = this.LocalStorageService.getMapPosition();
      this.editFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [mapPosition.center.lng, mapPosition.center.lat]
        },
        style: this.feature.style
      };
    }

    this.onFeatureEdit({
      $event: {
        action: 'edit'
      }
    });
  }

  saveGeometryEdit(feature) {
    this.edit = false;
    this.feature.geometry = this.feature ? this.feature.geometry : null;

    this.onFeatureChanged({
      $event: {
        feature: feature
      }
    });

    this.onFeatureEdit({
      $event: {
        action: 'none'
      }
    });
  }

  cancelGeometryEdit() {
    this.edit = false;

    this.onFeatureEdit({
      $event: {
        action: 'none'
      }
    });
  }

  _initializeDropDown() {
    this.$timeout(() => {
      if (!this.select) {
        this.select = new select.MDCSelect(this.$element.find('.mdc-select')[0]);
      }

      this.select.selectedIndex = 0;
      this.select.value = " ";
      this.initialized = true;
    });
  }
}

GeometryEditController.$inject = ['$element', '$timeout', 'MapService', 'LocalStorageService'];

export default {
  template: require('./geometry.edit.html'),
  bindings: {
    field: '<',
    feature: '<',
    onFeatureEdit: '&',
    onFeatureChanged: '&'
  },
  controller: GeometryEditController
};
