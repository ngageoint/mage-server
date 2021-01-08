'use strict';

module.exports = {
  template: require('./export-button.component.html'),
  bindings: {
    drawer: '<',
    myself: '<'
  },
  controller: ExportButtonController
};

ExportButtonController.$inject = ['Event', 'ExportService'];

function ExportButtonController(Event, ExportService) {

  this.$onInit = function () {
    this.count = 0;
    setInterval(this.checkCompletedExports.bind(this), 10000);
  };

  this.$onChanges = function (changes) {
    this.checkCompletedExports();
  }

  this.export = function () {
    Event.query().$promise.then(function (events) {
      this.events = events;
    }.bind(this));
    this.exportOpen = { opened: true };
  };

  this.onExportClose = function () {
    this.exportOpen = { opened: false };
  };

  this.checkCompletedExports = function () {
    if (this.myself) {
      ExportService.getMyExports().then(response => {
        this.count = response.data.length;
      }).catch(err => {
        console.log(err);
      });
    }
  };
}