var angular = require('angular');

module.exports = {
  template: require('./wms.component.html'),
  bindings: {
    layer: '='
  },
  controller: WmsEditController
};

WmsEditController.$inject = ['$http'];

function WmsEditController($http) {
  var layer;

  this.wmsLayer = {};

  this.$onInit = function() {
    layer = angular.copy(this.layer);
  };

  this.$doCheck = function() {
    if (layer.url !== this.layer.url) {
      layer.url = this.layer.url;
      this.onUrlChange();
    }
  };

  this.onUrlChange = function() {
    var options = {
      headers: {
        'content-type': 'application/json'
      }
    };

    $http.post('/api/layers/wms/getcapabilities', {url: layer.url}, options).then(function(response) {
      var layer = response.data.Capability.Layer;
      var layers = [];
      this.parseLayer(layer, layers);

      layers.forEach(function(layer) {
        console.log('Layer w/ title', layer.Title);
      });

      this.layer.wms = {
        layers: layers
      };
    }.bind(this), function(response) {
      console.log('wms fail', response);
    })
  };

  this.parseLayer = function(layer, layers) {
    var children = layer.Layer;
    if (!children) return;

    children.forEach(function(child) {
      if (child.Layer) {
        this.parseLayer(child, layers);
      } else {
        layers.push(child);
      }
    }.bind(this));
  };
}
