var moment = require('moment')
  , MDCTextField = require('material-components-web').textField.MDCTextField
  , MDDateTimePicker = require('../vendor/md-date-time-picker');

module.exports = {
  template: require('./datetime.component.html'),
  bindings: {
    date: '<',
    fieldName: '@',
    required: '<',
    onDatePicked: '&'
  },
  controller: DateTimeController
};

DateTimeController.$inject = ['$element', '$timeout', 'LocalStorageService'];

function DateTimeController($element, $timeout, LocalStorageService) {
  var dateInputField;

  this.timeZone = LocalStorageService.getTimeZoneEdit();
  
  this.$onInit = function() {
    dateInputField = new MDCTextField($element.find('.mdc-text-field')[0]);

    if (this.date) {
      this.pickedDate = this.date;
      if (dateInputField) {
        $timeout(function() {
          dateInputField.value = this.dateInputValue = moment(this.date).format('MM/DD/YYYY hh:mm:ss');
        }.bind(this));
      }
    }
    this.localOffset = moment().format('Z');
  };

  this.$onChanges = function() {
    if (this.date) {
      this.pickedDate = this.date;
      if (dateInputField) {
        $timeout(function() {
          dateInputField.value = this.dateInputValue = moment(this.date).format('MM/DD/YYYY hh:mm:ss');
        }.bind(this));
      }
    }
  };

  this.inputChanged = function() {
    var isValid = moment(this.dateInputValue).isValid();
    if (isValid) {
      this.pickedDate = moment(this.dateInputValue).format('MM/DD/YYYY hh:mm:ss');
      this.onDatePicked({
        date: this.pickedDate,
        timeZone: this.timeZone
      });
    }
  };

  this.openPicker = function() {
    var dialog = new MDDateTimePicker.default({
      type: 'datetime',
      init: moment(this.pickedDate),
      future: moment().add(5, 'years'),
      trigger: $element.find('.date-input')[0],
      orientation: 'LANDSCAPE'
    });
    $element.find('.date-input')[0].addEventListener('onOk', function() {
      this.pickedDate = dialog.time.toDate();
      dateInputField.value = this.dateInputValue = dialog.time.format('MM/DD/YYYY hh:mm:ss');
      this.onDatePicked({
        date: this.pickedDate,
        timeZone: this.timeZone
      });
    }.bind(this));
    dialog.show();
  };

  this.updateTimeZone = function() {
    this.timeZone = this.timeZone === 'gmt' ? 'local' : 'gmt';
    this.onDatePicked({
      date: this.pickedDate,
      timeZone: this.timeZone
    });
  };

}