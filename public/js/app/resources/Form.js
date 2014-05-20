angular.module('mage').factory('Form', ['$resource', '$http', function($resource, $http) {
  var Form = $resource('/api/forms/:id', {
    id: '@id'
  }, {
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
      cache: true,
      isArray: true
    }
  });

  Form.prototype.$save = function(params, success, error) {
    if (this.id) {
      this.$update(params, success, error);
    } else {
      this.$create(params, success, error);
    }
  };

  return Form;

}]);
