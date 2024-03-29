const angular = require('angular')
  , EventResource = require('./event.resource')
  , TeamResource = require('./team.resource')
  , FormResource = require('./form.resource')
  , ObservationResource = require('./observation.resource');

angular.module('mage')
  .factory('Api', require('./api.resource'))
  .factory('DeviceService', require('./device.service'))
  .factory('LocalStorageService', require('./local-storage.service'))
  .factory('UserService', require('./user.service'))
  .factory('UserIconService', require('./user.icon.service'))
  .factory('LoginService', require('./login.service'))
  .factory('MapService', require('./map.service'))
  .factory('Team', TeamResource.Team)
  .factory('TeamAccess', TeamResource.TeamAccess)
  .factory('FeatureService', require('./feature.service'))
  .factory('GeometryService', require('./geometry.service'))
  .factory('Form', FormResource.Form)
  .factory('FormIcon', FormResource.FormIcon)
  .factory('Event', EventResource.Event)
  .factory('EventAccess', EventResource.EventAccess)
  .factory('EventService', require('./event.service'))
  .factory('Observation', ObservationResource.Observation)
  .factory('ObservationFavorite', ObservationResource.ObservationFavorite)
  .factory('ObservationImportant', ObservationResource.ObservationImportant)
  .factory('ObservationState', ObservationResource.ObservationState)
  .factory('ObservationAttachment', ObservationResource.ObservationAttachment)
  .factory('ObservationService', require('./observation.service'))
  .factory('LocationService', require('./location.service'))
  .factory('Location', require('./location.resource'))
  .factory('Layer', require('./layer.resource'))
  .factory('LayerService', require('./layer.service'))
  .factory('FilterService', require('./filter.service'))
  .factory('Settings', require('./settings.resource'))
  .factory('PollingService', require('./polling.service'))
  .factory('Plugin', require('./plugin.resource'))
  .factory('UserPagingService', require('./user-paging.service'))
  .factory('DevicePagingService', require('./device-paging.service'))
  .factory('TeamPagingService', require('./team-paging.service'))
  .factory('AuthenticationConfigurationService', require('./authentication-configuration.service'));
