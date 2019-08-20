var MDCSelect = require('material-components-web').select.MDCSelect;

module.exports = {
  template: require('./dropdown.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: ['$timeout', '$element', function($timeout, $element) {

    this.$postLink = function() {
      this.initializeDropDown();
    }
    
    this.initializeDropDown = function() {
      $timeout(function() {
        if (!this.select && this.field)
        this.select = new MDCSelect($element.find('.mdc-select')[0]);
        
        this.select.listen('MDCSelect:change', function() {
          $timeout(function() {
            if (this.select.value && this.select.value !== '') {
              this.field.value = this.select.value;
            } else {
              this.field.value = undefined;
            }
          }.bind(this))
        }.bind(this));
      }.bind(this))
    }
  }]
};
