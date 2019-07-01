const MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./password.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: function($element, $timeout) {
    this.$postLink = function() {
      this.textField = new MDCTextField($element.find('.mdc-text-field')[0]);
    }

    this.$onChanges = function() {
      $timeout(function() {
        if (this.field.value) {
          this.textField.value = this.field.value;
        }
      }.bind(this));
    }
  }
};
