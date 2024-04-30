import angular from 'angular';
import WebFont from 'webfontloader';

class MapIconController {
  constructor($element, UserIconService) {
    this.$element = $element;
    this.UserIconService = UserIconService;
  }

  $onInit() {
    this.fontLoaded = false;

    WebFont.load({
      custom: {
        families: ['RobotoMono']
      },
      fontactive: () => {
        this.fontLoaded = true;
        this.updateIcon();
      }
    });

    this.previousIcon = angular.copy(this.icon);
  }

  $doCheck() {
    if (!this.fontLoaded) return;

    if (!angular.equals(this.icon, this.previousIcon)) {
      this.updateIcon();
      this.previousIcon = angular.copy(this.icon);
    }
  }

  updateIcon() {
    var canvas = this.$element.find('canvas')[0];
    this.UserIconService.drawMarker(canvas, this.icon.color, this.icon.text);

    this.icon.getCanvas = function() {
      return canvas;
    };
  }
}

MapIconController.$inject = ['$element', 'UserIconService'];

export default {
  template: '<canvas></canvas>',
  bindings: {
    icon: '<'
  },
  controller: MapIconController
};
