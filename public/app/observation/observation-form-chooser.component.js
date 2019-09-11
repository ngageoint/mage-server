module.exports = {
  template: require('./observation-form-chooser.component.html'),
  bindings: {
    forms: '<',
    onFormPicked: '&',
    onFormClose: '&'
  },
  controller: ObservationFormChooserController
};

ObservationFormChooserController.$inject = [];

function ObservationFormChooserController() {
}