var $ = require('jquery');

module.exports = LayerService;

LayerService.$inject = ['$q', 'Layer', 'LocalStorageService'];

function LayerService($q, Layer, LocalStorageService) {
  var service = {
    getLayersForEvent: getLayersForEvent,
    uploadGeopackage: uploadGeopackage
  };

  return service;

  function getLayersForEvent(event) {
    var deferred = $q.defer();
    Layer.queryByEvent({eventId: event.id}, function(layers) {
      deferred.resolve(layers);
    });

    return deferred.promise;
  }

  function uploadGeopackage(data) {
    var deferred = $q.defer();

    var formData = new FormData();
    for (var property in data) {
      if (data[property] != null) {
        formData.append(property, data[property]);
      }
    }

    $.ajax({
      url: '/api/layers',
      type: 'POST',
      headers: {
        'Authorization': 'Bearer ' + LocalStorageService.getToken()
      },
      xhr: function() {
        var myXhr = $.ajaxSettings.xhr();
        if (myXhr.upload) {
          myXhr.upload.addEventListener('progress', function(e) {
            deferred.notify(e);
          }, false);
        }
        return myXhr;
      },
      success: function(data) {
        deferred.resolve(data);
      },
      error: function() {
        deferred.reject();
      },
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    });

    return deferred.promise;
  }
}
