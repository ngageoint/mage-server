var MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./textarea.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: function($element, $timeout) {
    this.$postLink = function() {
      this.textField = new MDCTextField($element.find('.mdc-text-field')[0])
    }
    this.$onChanges = function() {
      $timeout(function() {
        this.textField.value = this.field.value;
      }.bind(this))
    }
  }
};
