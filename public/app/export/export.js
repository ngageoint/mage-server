angular
  .module('mage')
  .controller('ExportController', ExportController);

ExportController.$inject = ['$scope', '$modalInstance', '$http', 'LocalStorageService', 'FilterService', 'events'];

function ExportController($scope, $modalInstance, $http, LocalStorageService, FilterService, events) {
  $scope.exportEvent = {selected: FilterService.getEvent()};
  $scope.events = events;

  var fileExport = angular.element('#file-export');
  fileExport.load(function() {
    alert('file download is complete');
  });

  $scope.exportLocations = {value: true};
  $scope.exportObservations = {value: true};

  $scope.localOffset = moment().format('Z');
  $scope.localTime = true;

  $scope.startDate = moment().startOf('day').toDate();
  $scope.endDate = moment().add(1, 'days').toDate();

  $scope.startDatePopup = {open: false};
  $scope.endDatePopup = {open: false};

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
  $scope.exportTime = $scope.exportOptions[0];

  $scope.closeModal = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.openStartDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.startDatePopup.open = true;
  };

  $scope.openEndDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.endDatePopup.open = true;
  };

  $scope.exporting = {};
  $scope.exportData = function($event, type) {
    if (!$scope.exportEvent.selected) {
      $event.preventDefault();
      $scope.showEventError = true;
      return false;
    }

    $scope.showEventError = false;
    $scope.exporting[type] = true;

    if ($scope.exportTime.custom) {
      var startDate = moment($scope.startDate);
      if (startDate) {
        startDate = $scope.localTime ? startDate.utc() : startDate;
        var start = startDate.format("YYYY-MM-DD HH:mm:ss");
      }

      var endDate = moment($scope.endDate);
      if (endDate) {
        endDate = $scope.localTime ? endDate.utc() : endDate;
        var end = endDate.format("YYYY-MM-DD HH:mm:ss");
      }
    } else if ($scope.exportTime.value) {
      var start = moment().subtract('seconds', $scope.exportTime.value).utc().format("YYYY-MM-DD HH:mm:ss");
    }

    var params = {
      eventId: $scope.exportEvent.selected.id,
      observations: $scope.exportObservations.value,
      locations: $scope.exportLocations.value,
      access_token: LocalStorageService.getToken()
    };

    if (start) params.startDate = start;
    if (end) params.endDate = end;

    var url = "api/" + type + "?" + $.param(params);
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
