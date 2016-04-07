angular
  .module('mage')
  .filter('filename', filenameFilter);

filenameFilter.$inject = ['$filter'];


function filenameFilter($filter) {
  function filter(input, limit) {
    if (!input || !limit) return input;

    var name = input.substr(0, input.lastIndexOf('.'));
    name = name.length > 6 ? $filter('limitTo')(name, 6) + "~" : name;
    return name + input.substr(input.lastIndexOf('.'));
  }

  filter.$stateful = true;
  return filter;
}
