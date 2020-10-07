'use strict';

module.exports = {
  template: require('./export-button.component.html'),
  bindings: {
    drawer: '<',
    myself: '<'
  },
  controller: ExportButtonController
};

ExportButtonController.$inject = ['$http', 'Event'];

function ExportButtonController($http, Event) {

  this.$onInit = function () {
    this.count = 0;
    setInterval(this.checkCompletedExports.bind(this), 5000);
  };

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
    const url = "api/export/user/" + this.myself.id;
    
    /*$http.get(url).then(response => {
      this.count = response.data.length;
    }).catch(err => {
      console.log(err);
    });*/
  };
}