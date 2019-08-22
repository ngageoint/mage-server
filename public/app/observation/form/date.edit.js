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

DateEditController.$inject = [];

function DateEditController() {

  this.$onChanges = function() {
    this.date = angular.copy(this.field.value);
  };

  this.formatDate = function(date, timeZone) {
    var momentDate = moment(date)
    if (timeZone === 'gmt') {
      momentDate.add(momentDate.utcOffset(), 'minutes')
    }
    this.field.value = momentDate.toDate();
  };

  this.today = function() {
    this.field.value = new Date();
  };

  this.clear = function () {
    this.field.value = null;
  };
}
