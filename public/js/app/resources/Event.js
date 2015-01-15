angular.module('mage').factory('Event', ['$resource', '$http', 'appConstants', 'mageLib', 'Feature', function($resource, $http, appConstants, mageLib, Feature) {
  var Event = $resource('/api/events/:id', {
    id: '@id'
  },{
    create: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    update: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    query: {
      isArray: true
    }
  });

  function defaultForm() {
    return {
      fields: [{
        id: 1,
        title: 'Date',
        type: 'date',
        required: true,
        name: "timestamp"
      },{
        id: 2,
        title: 'Location',
        type: 'geometry',
        required: true,
        name: 'geometry'
      },{
        id: 3,
        title: 'Type',
        type: 'dropdown',
        required: true,
        name: "type",
        choices: []
      }]
    };
  }

  function uploadProgress(e) {
    if(e.lengthComputable){
      $scope.$apply(function() {
        $scope.uploading = true;
        $scope.uploadProgress = (e.loaded/e.total) * 100;
      });
    }
  }

  function uploadComplete(response) {
    $scope.$apply(function() {
      $scope.uploadStatus = "Upload Complete";
      $scope.uploading = false;
      $scope.$emit('uploadComplete', $scope.url, response, $scope.uploadId);
    });
  }

  function uploadFailed() {
    $scope.$apply(function() {
      $scope.uploadStatus = "Upload Failed";
      $scope.uploading = false;
    });
  }

  Event.prototype.$save = function(params, success, error) {
    // Check for form import.  If so its a file upload
    if (!this.id && this.formArchiveFile) {
      console.log('upload time');
      var formData = new FormData();
      formData.append('form', this.formArchiveFile);
      for (var key in this) {
        if (this.hasOwnProperty(key) && key != 'formArchiveFile' ) {
          formData.append(key, this[key]);
        }
      }

      $.ajax({
        url: '/api/events',
        type: 'POST',
        headers: {
          authorization: 'Bearer ' + mageLib.getLocalItem('token')
        },
        xhr: function() {
          var myXhr = $.ajaxSettings.xhr();
          if(myXhr.upload){
            myXhr.upload.addEventListener('progress',uploadProgress, false);
          }
          return myXhr;
        },
        success: uploadComplete,
        error: uploadFailed,
        data: formData,
        cache: false,
        contentType: false,
        processData: false
      });

      return;
    }

    if (this.id) {
      this.$update(params, success, error);
    } else {
      this.form = defaultForm();
      this.$create(params, success, error);
    }
  };

  Event.prototype.getField = function(fieldName) {
    return _.find(this.form.fields, function(field) { return field.name == fieldName});
  };

  Event.prototype.getObservation = function() {
    var observation = new Feature({
      type: 'Feature',
      layerId: appConstants.featureLayer.id,
      properties: {
      }
    });

    observation.id = this.observationId;
    _.each(this.fields, function(field) {
      switch (field.name) {
      case 'geometry':
        observation.geometry = {
          type: 'Point',
          coordinates: [field.value.x, field.value.y]
        }
        break;
      default:
        observation.properties[field.name] = field.value;
      }
    });

    return observation;
  }

  return Event;

}]);
