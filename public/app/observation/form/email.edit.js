const MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./email.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: ['$element', '$timeout', function($element, $timeout) {
    this.$postLink = function() {
      this.textField = new MDCTextField($element.find('.mdc-text-field')[0]);
      if (this.field.value)
        this.textField.value = this.field.value;
    }

    this.$onChanges = function() {
      $timeout(function() {
        if (this.textField && this.field.value) {
          this.textField.value = this.field.value;
        }
      }.bind(this));
    }
  }]
};
