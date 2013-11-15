angular.module('mage.featureService')
.factory('Feature', ['$resource', '$http', function($resource, $http) {

	var removeTransients = function(data) {
		if (data.layerId) {
			delete data.layerId;
		}
		return data;
	};

	var createResources = function(data) {
		if (!data.features) return data;
		for (var i = 0; i < data.features.length; i++) {
			data.features[i] = new Feature(data.features[i]);
		}
		return data;
	};

	var Feature = $resource('/FeatureServer/:layerId/features/:id', {
		id: '@id',
		layerId: '@layerId'
	}, {
		create: {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			transformRequest: _.flatten([removeTransients, $http.defaults.transformRequest])
		},
		update: {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			transformRequest: _.flatten([removeTransients, $http.defaults.transformRequest])
		},
		get: {
			method: 'GET'
		},
		getAll: {
			url: '/FeatureServer/:layerId/features',
			method: 'GET',
			transformResponse: _.flatten([$http.defaults.transformResponse, createResources])
		}
	});

	Feature.prototype.$save = function(params, success, error) {
		if(this.id) {
			this.$update(params, success, error);
		} else {
			this.$create(params, success, error);
		}
	};

	return Feature;
}])
.factory('FeatureAttachment', ['$resource', '$http', function($resource, $http) {
	var FeatureAttachment = $resource('/FeatureServer/:layerId/features/:featureId/attachments/:id', {
		
	}, {
		get: {
			method: 'GET'
		}
	});
	return FeatureAttachment;
}]);