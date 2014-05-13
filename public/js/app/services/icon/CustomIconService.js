mage.factory('CustomIconService', ['$rootScope', '$http', '$q',
    function ($rootScope, $http, $q) {

      var allIconsPromise;
      var theIcons;

      var ***REMOVED*** = {};

      ***REMOVED***.getAllIcons = function () {
        allIconsPromise = allIconsPromise || $http.get('/api/icons').then(function(response) {
          theIcons = response.data;
          return theIcons;
        });
        return allIconsPromise;
      };

      ***REMOVED***.addNewIcon = function (response) {
        theIcons.push(response);
        allIconsPromise = $q.when(theIcons);
        $rootScope.$broadcast('newIcon', allIconsPromise);
      };

      return ***REMOVED***;
}]);
