var moment = require('moment')
  , MDCDialog = require('material-components-web').dialog.MDCDialog
  , MDCTextField = require('material-components-web').textField.MDCTextField
  , MDDateTimePicker = require('../../vendor/md-date-time-picker');

module.exports = {
  template: require('./observation-form-chooser.component.html'),
  bindings: {
    forms: '<',
    onFormPicked: '&',
    onFormClose: '&'
  },
  controller: ObservationFormChooserController
};

ObservationFormChooserController.$inject = ['$element', '$timeout'];

function ObservationFormChooserController($element, $timeout) {
}