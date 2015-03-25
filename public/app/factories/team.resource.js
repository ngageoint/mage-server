angular.module('mage').factory('Team', ['$resource', '$http', function($resource, $http) {

	var Team = $resource('/api/teams/:id', {
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
		}
	});

	Team.prototype.$save = function(params, success, error) {
		if (this.id) {
			this.$update(params, success, error);
		} else {
			this.$create(params, success, error);
		}
	};

	return Team;

}]);
