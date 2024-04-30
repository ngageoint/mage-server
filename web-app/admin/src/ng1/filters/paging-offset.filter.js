OffsetFilter.$inject = [];

module.exports = OffsetFilter;

function OffsetFilter() {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
}
