module.exports = Api;

Api.$inject = ['$resource'];

function Api($resource) {
  var Api = $resource('/api', {
    get: {
      method: 'GET',
      isArray: false
    }
  });

  return Api;
}
