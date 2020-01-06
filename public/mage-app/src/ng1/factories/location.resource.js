module.exports = Location;

Location.$inject = ['$resource'];

function Location($resource) {
  var Location = $resource('/api/events/:eventId/locations/:groupBy', {
    eventId: '@eventId',
    groupBy: '@groupBy'
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
