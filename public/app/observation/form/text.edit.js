const MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./text.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: function($element) {
    this.$postLink = function() {
      new MDCTextField($element.find('.mdc-text-field')[0]);
    }
  }
};
