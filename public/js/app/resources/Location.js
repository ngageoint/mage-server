angular
	.module('mage')
	.factory('Location', Location);

Location.$inject = ['$resource'];

function Location($resource) {
	var Location = $resource('/api/events/:eventId/locations', {
		eventId: '@eventId'
	},{
    create: {
      method: 'POST',
      isArray: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  return Location;
}
