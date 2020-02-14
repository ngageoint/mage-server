var _ = require('underscore');

module.exports = {
  Form: Form,
  FormIcon: FormIcon
};

Form.$inject = ['$rootScope', '$resource', 'LocalStorageService'];

function Form($rootScope, $resource, LocalStorageService) {
  var Form = $resource('/api/events/:eventId/forms/:id', {
    eventId: '@eventId',
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
    }
  });

  Form.prototype.$save = function(params, success, error) {
    if (this.id) {
      this.$update(params, success, error);
    } else {
      if (this.formArchiveFile) {
        var formData = new FormData();
        formData.append('form', this.formArchiveFile);
        for (var key in this) {
          if (Object.prototype.hasOwnProperty.call(this, key) && key !== 'formArchiveFile' ) {
            formData.append(key, this[key]);
          }
        }

        var self = this;
        jQuery.ajax({
          url: '/api/events/' + this.eventId + '/forms',
          type: 'POST',
          headers: {
            authorization: 'Bearer ' + LocalStorageService.getToken()
          },
          success: function(response) {
            delete self.formArchiveFile;
            _.extend(self, response);
            $rootScope.$apply(function() {
              success(self);
            });
          },
          error: function(response) {
            if (!_.isFunction(error)) return;

            var contentType = response.getResponseHeader("content-type") || "";
            if (contentType.indexOf('json') > -1) {
              response.responseJSON = JSON.parse(response.responseText);
            }

            $rootScope.$apply(function() {
              error(response);
            });
          },
          data: formData,
          cache: false,
          contentType: false,
          processData: false
        });
      } else {
        this.$create(params, success, error);
      }
    }
  };

  return Form;
}

FormIcon.$inject = ['$resource'];

function FormIcon($resource) {
  var FormIcon = $resource('/api/events/:eventId/icons/:formId.json', {});

  return FormIcon;
}
