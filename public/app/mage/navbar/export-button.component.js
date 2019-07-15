module.exports = {
  template: require('./export-button.component.html'),
  bindings: {
    drawer: '<'
  },
  controller: ExportButtonController
};

ExportButtonController.$inject = ['Event'];

function ExportButtonController(Event) {

  this.export = function() {
    this.events = Event.query();
    this.exportOpen = {opened: true};
  };

  this.onExportClose = function() {
    this.exportOpen = {opened: false};
  }
}