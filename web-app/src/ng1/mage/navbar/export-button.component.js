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
    setInterval(this.checkCompletedExports.bind(this), 5 * 60 * 1000);
  };

  this.$onChanges = function (changes) {
    this.checkCompletedExports();
  }

  this.export = function () {
    Event.query().$promise.then(events => {
      this.events = events;
    });
    this.exportOpen = { opened: true };
  };

  this.onExportClose = function () {
    this.exportOpen = { opened: false };
  };

  this.checkCompletedExports = function () {
    if (this.myself) {
      ExportService.getExports().subscribe(exports => {
        this.count = exports.length;
      })
    }
  };
}