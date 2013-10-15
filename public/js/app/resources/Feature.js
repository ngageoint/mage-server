angular.module('mage.featureService')
.factory('Feature', ['$resource', '$http', function($resource, $http) {

	var Feature = $resource('/FeatureServer/:layerId/features/:id', {
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
		get: {
			method: 'GET'
		},
		getAll: {
			url: '/FeatureServer/:layerId/features',
			method: 'GET',
			params: {
				fields: {
					geometry: 1,
					attachments: 1,
					properties: {
						TYPE: 1,
						EVENTLEVEL: 1,
						EVENTDATE: 1,
						userId: 1,
						style: 1
					}
				}
			}
		}
	});

	Feature.prototype.$save = function(params, success, error) {
		if(this.id) {
			this.$update(params, success, error);
		} else {
			this.$create(params, success, error);
		}
	}

	return Feature;
}])
.factory('FeatureAttachment', ['$resource', '$http', function($resource, $http) {
	var FeatureAttachment = $resource('/FeatureServer/:layerId/features/:featureId/attachments/:id', {
		
	}, {
		get: {
			method: 'GET',
			transformResponse: _.flatten[$http.defaults.transformResponse, function(data, getHeaders) {
				console.info('data is', data);
				return data;
			}]
		}
	});
	return FeatureAttachment;
}]);