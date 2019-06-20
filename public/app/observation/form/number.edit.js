const MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./number.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: function($element, $timeout) {
    this.$postLink = function() {
      var textField = new MDCTextField($element.find('.mdc-text-field')[0]);
      textField.value = this.field.value;
      if (this.field.hasOwnProperty('min') && !this.field.hasOwnProperty('max')) {
        this.helperText = `Must be greater than ${this.field.min}`;
      } else if (!this.field.hasOwnProperty('min') && this.field.hasOwnProperty('max')) {
        this.helperText = `Must be less than ${this.field.max}`;
      } else if (this.field.hasOwnProperty('min') && this.field.hasOwnProperty('max')) {
        this.helperText = `Must be between ${this.field.min} and ${this.field.max}`
      }
    }

    // this.$onChanges = function() {
      
    // }
  }
};
