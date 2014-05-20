'use strict';

/*
  Taking the feature functionality out of the observation directive and sonsolidating and cleaning
  it up here.

  Trying to make it so that the heavy lifting and data manipulation is on the caller of these functions.
  In most cases, for MAGE, that is going to be the map controller.
*/
angular.module('mage.featureService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('FeatureService', ['$http', 'appConstants', 'mageLib', 'Feature',
    function ($http, appConstants, mageLib, Feature) {
      var featureServiceFunctions = {};

      /*
        Handles saving new features as well as updating existing ones.
        @param {Number} layerId: The layer that you would like to create the new observation in.
        @param {Object} observation: The observation to be created.
        @param {String} operation: Since ESRI created their API with Flex clients in mind, they have no PUT,
          as such, updates are handled as a POST. The operation parameter tells our implementation
          of the ESRI API whether to create (addFeatures), or update (updateFeatures).
        @return A promise of the REST call that the caller can use to determine what to do with the
          success or failure.
      */
      featureServiceFunctions.createFeature = function (layerId, observation) {
        var theFeature = new Feature(observation);
        theFeature.layerId = layerId;
        return observation.$save();
      };

      featureServiceFunctions.updateFeature = function (layerId, observation, method) {
        var theFeature = new Feature(observation);
        theFeature.layerId = layerId;
        return observation.$save();
      };

      /*
        If an observation has attachments, after it has been created, call this menthod with the new
        observation ID, to upload photos, videos, etc.
        @param {Number} layerId: The layer that corresponds to the object to which would like to add attachments.
        @param {Number} observationId: The observation that you would like to attach the files to.
        @param {File} file: The file that you would like to create as an attachment.
        @return A promise of the REST call that the caller can use to determine success or failuer and act accordingly.
      */
      featureServiceFunctions.uploadAttachment = function (layerId, observationId, file) {
        // just add code here
      };

      /*
        Return all of the observations from a layer.
        @param {Number} The layer that you would like to retrieve all of the features from.
        @return A promise of the REST call to get all of the features, so the caller can handle the success for failuer accordingly.
      */
      featureServiceFunctions.getFeatures = function (layerId) {
        return Feature.getAll({layerId: layerId});
      };

      /*
        Retrieve a single observation
        @param {Number} layerId: The layer the observation is in.
        @param {Number} observationId: The observation that you would like to retrieve.
        @return A promise of the REST call.
      */
      featureServiceFunctions.getFeature = function (layerId, observationId) {
        return $http.get('/FeatureServer/'+ layerId + '/' + observationId + "?query&outFields=*");
      };

      featureServiceFunctions.getAttachments = function (layerId, observationId) {
        return $http.get('/FeatureServer/'+ layerId + '/' + observationId + '/attachments');
      }

      featureServiceFunctions.deleteAttachment = function (layerId, observationId, attachmentId) {
        return $http.post('/FeatureServer/' + layerId + '/' + observationId + '/deleteAttachments' + '?attachmentIds=' +  attachmentId);
      }

      return featureServiceFunctions;
    }])
