angular
  .module('mage')
  .factory('LayerService', LayerService);

LayerService.$inject = ['$q', 'Layer'];

function LayerService($q, Layer) {
  var service = {
    getLayersForEvent: getLayersForEvent
  };

  return service;

  function getLayersForEvent(event) {
    var deferred = $q.defer();
    Layer.queryByEvent({eventId: event.id}, function(layers) {
      deferred.resolve(layers);
    });

    return deferred.promise;
  }
}
