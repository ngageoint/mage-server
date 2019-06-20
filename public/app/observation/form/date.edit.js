var  angular = require('angular')
  , moment = require('moment');

module.exports = {
  template: require('./date.edit.html'),
  bindings: {
    formField: '<',
    field: '<'
  },
  controller: DateEditController
};

DateEditController.$inject = ['LocalStorageService'];

function DateEditController(LocalStorageService) {

  // this.$onInit = function() {
  //   this.date = angular.copy(this.field.value);
  //   console.log('field', this.field)

  //   this.timeZone = LocalStorageService.getTimeZoneEdit();
  //   if (this.timeZome === 'local') this.localTime = true;
  //   // this.localOffset = moment().format('Z');
  //   // this.datePopup = { open: false };

  //   // this.formatDate();
  // };

  this.$onChanges = function(changes) {
    console.log('field', this.field)
    this.date = angular.copy(this.field.value);
    console.log('field', this.field)

    this.timeZone = LocalStorageService.getTimeZoneEdit();
    if (this.timeZome === 'local') this.localTime = true;
    // if (changes.formField) {
    //   this.formatDate();
    // }
  };

  // this.onTimeZoneChange = function() {
  //   this.timeZone = this.timeZone === 'local' ? 'gmt' : 'local';
  //   this.localTime = !this.localTime;
  //   LocalStorageService.setTimeZoneEdit(this.timeZone);
  //   this.formatDate();
  // };

  // this.openDate = function($event) {
  //   $event.preventDefault();
  //   $event.stopPropagation();

  //   this.datePopup.open = true;
  // };

  this.onDateChanged = function() {
    this.formatDate();
  };

  this.formatDate = function(date, localTime) {
    LocalStorageService.setTimeZoneEdit(localTime ? 'local' : 'gmt');
    // if (this.formField && this.formField.$valid) {
    //   var date = moment(this.date);
    //   if (this.timeZone === 'gmt') {
    //     date.add(date.utcOffset(), 'minutes');
    //   }

      this.field.value = date;
    // }
  };

  this.today = function() {
    this.field.value = new Date();
  };

  this.clear = function () {
    this.field.value = null;
  };
}
