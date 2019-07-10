module.exports = {
  template: require('./export-button.component.html'),
  bindings: {
  },
  controller: ExportButtonController
};

ExportButtonController.$inject = ['$uibModal', 'Event'];

function ExportButtonController($uibModal, Event) {
  this.export = function() {
    $uibModal.open({
      template: require('../../export/export.html'),
      controller: 'ExportController',
      backdrop: 'static',
      resolve: {
        events: function () {
          return Event.query();
        }
      }
    });
  };
}