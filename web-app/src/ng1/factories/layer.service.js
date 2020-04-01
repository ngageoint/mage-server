module.exports = LayerService;

LayerService.$inject = ['$q', 'Layer', 'FilterService', 'LocalStorageService'];

function LayerService($q, Layer, FilterService, LocalStorageService) {
  const service = {
    getLayersForEvent,
    uploadGeopackage,
    getClosestFeaturesForLayers,
    makeAvailable,
  };

  return service;

  function getLayersForEvent(event, includeUnavailable) {
    const deferred = $q.defer();
    Layer.queryByEvent({ eventId: event.id, includeUnavailable: includeUnavailable }, function(layers) {
      deferred.resolve(layers);
    });

    return deferred.promise;
  }

  function getClosestFeaturesForLayers(layerIds, latlng, tile) {
    const deferred = $q.defer();
    const event = FilterService.getEvent();
    Layer.closestFeatureByLayer({eventId: event.id}, { layerIds: layerIds, latlng: latlng, tile: tile }, function(features) {
      deferred.resolve(features);
    });

    return deferred.promise;
  }

  function makeAvailable(layerId) {
    const theDeferred = $q.defer();
    $http
      .get('/api/layers/' + layerId + '/available', {
        headers: { 'Content-Type': 'application/json' },
      })
      .success(function(layer) {
        theDeferred.resolve(layer);
      })
      .error(function(e) {
        theDeferred.reject(e.responseJSON);
      });

    return theDeferred.promise;
  }

  function uploadGeopackage(data) {
    const deferred = $q.defer();

    const formData = new FormData();
    for (const property in data) {
      if (data[property] != null) {
        formData.append(property, data[property]);
      }
    }

    jQuery.ajax({
      url: '/api/layers',
      type: 'POST',
      headers: {
        Authorization: 'Bearer ' + LocalStorageService.getToken(),
      },
      xhr: function() {
        const myXhr = jQuery.ajaxSettings.xhr();
        if (myXhr.upload) {
          myXhr.upload.addEventListener(
            'progress',
            function(e) {
              deferred.notify(e);
            },
            false,
          );
        }
        return myXhr;
      },
      success: function(data) {
        deferred.resolve(data);
      },
      error: function(e) {
        deferred.reject(e.responseJSON);
      },
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
    });

    return deferred.promise;
  }
}
