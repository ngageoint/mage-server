mage.directive('fileUploader', function() {
  return {
    restrict: 'A',
    transclude: true,
    template: '<div><span ng-show="files.length">{{files[0].name}} - {{files[0].type}} </span> <span cl***REMOVED***="btn btn-primary fileinput-button" ng-hide="files.length">'
                    +'<i cl***REMOVED***="glyphicon glyphicon-plus"></i>'
                    +'<span>Choose New Icon</span>'
                    +'<input type="file"/>'
                +'</span><button ng-show="files.length" cl***REMOVED***="btn btn-success" ng-click="upload()">Upload</button></div>',
    controller: function($scope, $fileUpload, CustomIconService) {
      $scope.notReady = true;
      $scope.upload = function() {
        $fileUpload.upload($scope.files, function(data, status, headers, config) {
          CustomIconService.addNewIcon(data);
        });
      };
    },
    link: function($scope, $element) {
      var fileInput = $element.find('input[type="file"]');
      fileInput.bind('change', function(e) {
        $scope.notReady = e.target.files.length == 0;
        $scope.files = [];
        for(var i in e.target.files) {
          //Only push if the type is object for some ***REMOVED***-***REMOVED*** reason browsers like to include functions and other junk
          if(typeof e.target.files[i] == 'object') $scope.files.push(e.target.files[i]);
        }
        $scope.$apply();
      });
    }
  }
});

mage.***REMOVED***('$fileUpload', ['$http', 'mageLib', function($http, mageLib) {
  this.upload = function(files, success) {
    //Not really sure why we have to use FormData().  Oh yeah, browsers suck.
    var formData = new FormData();
    for(var i in files) {
      formData.append('icon', files[i]);
    }
    console.log(formData);
    $http({method: 'POST', url: '/api/icons', data: formData, headers: {'Content-Type': undefined}, transformRequest: angular.identity})
    .success(success);
  }
}]);
