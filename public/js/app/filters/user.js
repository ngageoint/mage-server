angular.module('mage').filter('user', ['$parse', function($parse) {
  return function(collection, properties, search) {
    if (!search) return collection;

    var match = new RegExp(search, 'i');
    return collection.filter(function(element) {
      return properties.some(function(property) {
        return match.test(element[property])
      });
    });
  }
}]);
