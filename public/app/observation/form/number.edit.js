const MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./number.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: ['$element', '$timeout', function($element, $timeout) {
    this.$postLink = function() {
      this.textField = new MDCTextField($element.find('.mdc-text-field')[0]);
      if (Object.prototype.hasOwnProperty.call(this.field, 'min') && !Object.prototype.hasOwnProperty.call(this.field, 'max')) {
        this.helperText = 'Must be greater than ' + this.field.min;
      } else if (!Object.prototype.hasOwnProperty.call(this.field, 'min') && Object.prototype.hasOwnProperty.call(this.field, 'max')) {
        this.helperText = 'Must be less than ' + this.field.max;
      } else if (Object.prototype.hasOwnProperty.call(this.field, 'min') && Object.prototype.hasOwnProperty.call(this.field, 'max')) {
        this.helperText = 'Must be between ' + this.field.min + ' and ' + this.field.max;
      }
    };

    this.$onChanges = function() {
      $timeout(function() {
        if (this.field.value) {
          this.textField.value = this.field.value;
        }
      }.bind(this));
    };

  }]
};
