angular
	.module('mage')
	.factory('Settings', Settings);

  Settings.$inject = ['$resource', '$http'];

function Settings($resource, $http) {
	var Settings = $resource('/api/settings/:type', {
		type: '@type'
	},{
		update: {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			}
		},
    updateBanner: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      url: '/api/settings/banner'
    }
	});

	return Settings;

}
