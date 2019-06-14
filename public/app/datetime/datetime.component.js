var moment = require('moment')
  , MDCDialog = require('material-components-web').dialog.MDCDialog
  , MDCTextField = require('material-components-web').textField.MDCTextField
  , MDDateTimePicker = require('../../vendor/md-date-time-picker');

module.exports = {
  template: require('./datetime.component.html'),
  bindings: {
    date: '<',
    localTime: '<',
    fieldName: '@',
    onDatePicked: '&'
  },
  controller: DateTimeController
};

DateTimeController.$inject = ['$element', '$timeout'];

function DateTimeController($element, $timeout) {
  var dateInputField;
  var filterPanel;
  
  this.$onInit = function() {
    dateInputField = new MDCTextField($element.find('.mdc-text-field')[0]);
  }

  this.$onChanges = function() {
    if (this.date) {
      this.pickedDate = this.date;
      if (dateInputField) {
        dateInputField.value = this.dateInputValue = moment(this.date).format('MM/DD/YYYY hh:mm:ss');
      }
    }
  }

  this.openPicker = function() {
    var dialog = new MDDateTimePicker.default({
      type: 'datetime',
      init: moment(this.pickedDate),
      future: moment().add(5, 'years'),
      trigger: $element.find('.date-input')[0],
      orientation: 'LANDSCAPE'
    })
    $element.find('.date-input')[0].addEventListener('onOk', function() {
      this.pickedDate = dialog.time.toDate();
      dateInputField.value = this.dateInputValue = dialog.time.format('MM/DD/YYYY hh:mm:ss');
      this.onDatePicked({
        date: this.pickedDate,
        localTime: this.localTime
      });
    }.bind(this))
    dialog.show();
  }

  this.updateTimeZone = function() {
    this.localTime = !this.localTime
    this.onDatePicked({
      date: this.pickedDate,
      localTime: this.localTime
    });
    console.log('date picked', this.localTime)
  }

}