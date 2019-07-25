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

  this.$onChanges = function() {
    this.date = angular.copy(this.field.value);

    this.timeZone = LocalStorageService.getTimeZoneEdit();
    if (this.timeZome === 'local') this.localTime = true;
  };

  this.onDateChanged = function() {
    this.formatDate();
  };

  this.formatDate = function(date, localTime) {
    LocalStorageService.setTimeZoneEdit(localTime ? 'local' : 'gmt');
    this.field.value = date;
  };

  this.today = function() {
    this.field.value = new Date();
  };

  this.clear = function () {
    this.field.value = null;
  };
}
