const MDCCheckbox = require('material-components-web').checkbox.MDCCheckbox
  , MDCFormField = require('material-components-web').formField.MDCFormField;

module.exports = {
  template: require('./checkbox.edit.html'),
  bindings: {
    field: '<'
  },
  controller: ['$element', function($element) {
    this.$postLink = function() {
      // $timeout(function() {
        var checkbox = new MDCCheckbox($element.find('.mdc-checkbox')[0])
        var formField = new MDCFormField($element.find('.mdc-form-field')[0])
        formField.input = checkbox;
      // }.bind(this))
    }
  }]
};
