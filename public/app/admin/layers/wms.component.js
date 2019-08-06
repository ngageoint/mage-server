var angular = require('angular')
  , xml2js = require('xml2js');

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
    var url = layer.url + '?request=GetCapabilities&service=WMS';
    $http.get(url, {

    }).then(function(response) {
      console.log('wms success', response);
    }, function(response) {
      console.log('wms fail', response);
    });
  };

}
