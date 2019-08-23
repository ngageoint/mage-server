var MDCMenuSurface = require('material-components-web').menuSurface.MDCMenuSurface
  , MDCTextField = require('material-components-web').textField.MDCTextField;

module.exports = {
  template: require('./typeahead.select.component.html'),
  bindings: {
    options: '<',
    initialValue: '<',
    fieldLabel: '@',
    idProperty: '@',
    displayProperty: '@',
    width: '@',
    onSelect: '&'
  },
  controller: TypeaheadSelectController
};

TypeaheadSelectController.$inject = ['$element', '$timeout'];

function TypeaheadSelectController($element, $timeout) {
  var menu;
  var textField;
  this.teamsUpdated = true;

  this.$onChanges = function() {
    $timeout(function() {
      this.initializeOptions();
    }.bind(this))
  }

  this.$postLink = function() {
    $timeout(function() {
      this.initializeTypeahead()
    }.bind(this))
  }
  this.initializeTypeahead = function() {
    this.idPropery = this.idProperty|| 'id';
    this.displayProperty = this.displayProperty || 'name';
    textField = new MDCTextField($element.find('.mdc-text-field')[0])
    menu = new MDCMenuSurface($element.find('.mdc-menu-surface')[0])
    menu.hoistMenuToBody()
    this.initializeOptions()
  }

  this.typeaheadChange = function() {
    this.openDropdown()
    $element.find('.mdc-text-field')[0].focus()
    var lowerCaseOption = this.selectedOptionDisplay.toLowerCase()
    this.sortedOptions = this.options.filter(function(option) {
      var matches = option[this.displayProperty].indexOf(this.selectedOptionDisplay) !== -1;
      console.log(`${option[this.displayProperty]} matches ${this.selectedOptionDisplay}: ${matches}`)
      return option[this.displayProperty].toLowerCase().indexOf(lowerCaseOption) !== -1;
    }.bind(this))
  }

  this.openDropdown = function() {
    if (!menu.isOpen()) {
      menu.open();
    }
  }

  this.setSelectedOption = function(option) {
    menu.close();
    this.selectedOption = option;
    this.selectedOptionDisplay = option.name;
    textField.value = this.selectedOptionDisplay;
    this.onSelect({event: option})
  }

  this.initializeOptions = function() {
    if (menu && this.options) {
      this.sortedOptions = this.options.sort(function(a, b) {
        if (a[this.displayProperty] < b[this.displayProperty]) return -1;
        if (a[this.displayProperty] > b[this.displayProperty]) return 1;
        return 0;
      }.bind(this))
      if (this.initialValue) {
        this.setSelectedOption(this.filteredOptions().find(function(option) {
          return this.initialValue[this.displayProperty] === option[this.displayProperty]
        }.bind(this)))
      }
    }
  }

  this.filteredOptions = function() {
    return this.sortedOptions;
  }
}
