var angular = require('angular');

angular.module('mage')
  .controller('AdminUsersController', require('./users.controller'))
  .controller('AdminUserEditController', require('./user.edit.controller'))
  .controller('AdminUserController', require('./user.controller'))
  .controller('AdminUserBulkController', require('./user.bulk.controller'))
  .directive('fileChange', function() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        var fileChangeFunc = scope.$eval(attrs.fileChange);
        element.bind('change', fileChangeFunc);
      }
    };
  })
  .directive('mapIcon', function() {
    var directive = {
      restrict: "A",
      template: '<canvas></canvas>',
      replace: true,
      scope: {
        icon: '=mapIcon'
      },
      controller: require('./map.icon.directive')
    };

    return directive;
  });
