'use strict';

angular.module('mage')
  .factory('ObservationService', ['$injector', 'appConstants',
    function($injector, appConstants) {
      return appConstants.getObservationService();
    }
  ]);