var angular = require('angular');

angular.module('mage')
  .controller('AdminEventController', require('./event.controller'))
  .controller('AdminEventEditController', require('./event.edit.controller'))
  .controller('AdminEventEditFormController', require('./event.edit.form.controller'))
  .controller('AdminEventEditFormFieldsController', require('./event.edit.form.fields.controller'))
  .controller('AdminEventEditFormMapSymbologyController', require('./event.edit.form.map-symbology.controller'))
  .controller('AdminEventEditFormFeedController', require('./event.edit.form.feed.controller'))
  .controller('AdminEventsController', require('./events.controller'))
  .controller('AdminEventAccessController', require('./event.access.controller'))
  .directive('stylePreview', require('./style-preview.directive'))
  .component('formStyle', require('./style.component'))
  .component('formCreatePanel', require('./event.form-upload.component'))
  .filter('events', require('./events.filter'));
