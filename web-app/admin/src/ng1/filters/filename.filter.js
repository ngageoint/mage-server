module.exports = FilenameFilter;

FilenameFilter.$inject = ['$filter'];

function FilenameFilter($filter) {
  function filter(input, limit) {
    if (!input || !limit) return input;

    var name = input.substr(0, input.lastIndexOf('.'));
    name = name.length > 6 ? $filter('limitTo')(name, 6) + "~" : name;
    return name + input.substr(input.lastIndexOf('.'));
  }

  filter.$stateful = true;
  return filter;
}
