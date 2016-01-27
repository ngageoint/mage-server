angular
  .module('mage')
  .filter('user', userFilter);

userFilter.$inject = [];

function userFilter() {
  return function(collection, properties, search) {
    if (!search) return collection;

    collection = (_.isArray(collection)) ? collection : [collection];

    if(!_.isArray(collection) || _.isUndefined(search)) {
      return collection;
    }

    var match = new RegExp(search, 'i');
    return collection.filter(function(element) {
      return properties.some(function(property) {
        return match.test(element[property]);
      });
    });
  };
}
