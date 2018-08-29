var  angular = require('angular')
  , moment = require('moment');

module.exports = {
  template: require('./date.edit.html'),
  bindings: {
    form: '<',
    field: '<'
  },
  controller: DateEditController
};

DateEditController.$inject = ['LocalStorageService'];

function DateEditController(LocalStorageService) {

  this.$onInit = function() {
    this.date = angular.copy(this.field.value);

    this.timeZone = LocalStorageService.getTimeZoneEdit();
    this.localOffset = moment().format('Z');
    this.datePopup = { open: false };

    this.formatDate();
  };

  this.onTimeZoneChange = function() {
    this.timeZone = this.timeZone === 'local' ? 'gmt' : 'local';
    LocalStorageService.setTimeZoneEdit(this.timeZone);
    this.formatDate();
  };

  this.openDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    this.datePopup.open = true;
  };

  this.onDateChanged = function() {
    this.formatDate();
  };

  this.formatDate = function() {
    if (this.form[this.field.name].$valid) {
      var date = moment(this.date);
      if (this.timeZone === 'gmt') {
        date.add(date.utcOffset(), 'minutes');
      }

      this.field.value = date.toDate();
    }
  };

  this.today = function() {
    this.field.value = new Date();
  };

  this.clear = function () {
    this.field.value = null;
  };
}
