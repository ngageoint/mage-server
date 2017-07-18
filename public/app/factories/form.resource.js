angular
  .module('mage')
  .factory('Form', Form);

Form.$inject = ['$rootScope', '$resource'];

function Form($rootScope, $resource) {
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
      this.$create(params, success, error);
    }
  };

  return Form;
}
