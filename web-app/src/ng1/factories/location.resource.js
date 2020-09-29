function Location($resource) {
  const Location = $resource('/api/events/:eventId/locations/:groupBy', {
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

Location.$inject = ['$resource'];

module.exports = Location;

