angular
  .module('mage')
  .filter('password', passwordFilter);

function passwordFilter() {
  return function(text) {
    if (!text) return null;

    return text.replace(/./g, "*");
  };
}
