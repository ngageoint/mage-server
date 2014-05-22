mage.directive('export', function(UserService, appConstants, mageLib) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/export.html",
    controller: function ($scope, $window, MapService, mageLib) {

      var fileExport = angular.element('#file-export');
      fileExport.load(function() {
      	alert('file download is complete');
      });

      $scope.ms = MapService;

      $scope.localOffset = moment().format('Z');
      $scope.localTime = true;

      $scope.exportStartDate = moment().startOf('day').toDate();
      $scope.exportEndDate = moment().endOf('day').toDate();

  	  /* Export existing points to  */
  	  $scope.exportOptions = [{
  	    value: 300,
  	    label: 'Last 5 minutes'
  	  },{
  	    value: 3600,
  	    label: 'Last Hour'
  	  },{
  	    value: 43200,
  	    label: 'Last 12 Hours'
  	  },{
  	    value: 86400,
  	    label: 'Last 24 Hours'
  	  },{
  	    all: true,
  	    value: null,
  	    label: 'All  (Use With Caution)'
  	  },{
  	    custom: true,
  	    value: null,
  	    label: 'Custom (Choose your own start/end)'
  	  }];
  	  $scope.export = $scope.exportOptions[0];

  	  $scope.exporting = {};
  	  $scope.exportData = function($event, type) {
  		var layerIds = _.pluck(_.filter($scope.featureLayers, function(layer) { return layer.exportChecked; }), 'id');
  		if (!$scope.fft && layerIds.length == 0) {
  			$event.preventDefault();
  	   		$scope.showLayerError = true;
  		    return false;
  		}

  		$scope.showLayerError = false;
  	  $scope.exporting[type] = true;

      if ($scope.export.custom) {
        var startDate = moment($scope.exportStartDate);
        if (startDate) {
          startDate = $scope.localTime ? startDate.utc() : startDate;
          var start = startDate.format("YYYY-MM-DD HH:mm:ss");
        }

        var endDate = moment($scope.exportEndDate);
        if (endDate) {
          endDate = $scope.localTime ? endDate.utc() : endDate;
          var end = endDate.format("YYYY-MM-DD HH:mm:ss");
        }
      } else if ($scope.export.value) {
        var start = moment().subtract('seconds', $scope.export.value).utc().format("YYYY-MM-DD HH:mm:ss");
      }

      var params = {
      	access_token: mageLib.getLocalItem('token'),
      	type: type
      };

      if (start) params.startDate = start;

      if (end) params.endDate = end;

      if ($scope.fft) params.fft = $scope.fft;

      if (layerIds.length) params.layerIds = layerIds.join(",");

      var url = "api/export?" + $.param(params);
      $.fileDownload(url)
      	.done(function() {
        		$scope.$apply(function() {
        			$scope.exporting[type] = false;
        		});
      	})
      	.fail(function() {
        		$scope.$apply(function() {
        			$scope.exporting[type] = false;
        		});
      	});
      }
    }
  };
});
