module.exports = Settings;

Settings.$inject = ['$resource'];

function Settings($resource) {
  var Settings = $resource('/api/plugins', {
    type: '@type'
  },{
    get: {
      headers: {
        'Accept': 'application/json'
      }
    },
    update: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  return Settings;
}
