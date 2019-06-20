var MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./textarea.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: function($element, $timeout) {
    this.$postLink = function() {
      var textField = new MDCTextField($element.find('.mdc-text-field')[0])
      textField.value = this.field.value;
    }
  }
};
