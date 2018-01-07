module.exports = function equals() {
  var directive = {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, elem, attrs, ngModel) {
      if (!ngModel) return;

      attrs.$observe('equals', function() {
        ngModel.$validate();
      });

      ngModel.$validators.equals = function(value) {
        return value === attrs.equals;
      };
    }
  };

  return directive;
};
