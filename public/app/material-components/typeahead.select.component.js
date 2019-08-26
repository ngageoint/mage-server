import {menuSurface, textField} from 'material-components-web'

class TypeaheadSelectController {

  constructor($element, $timeout) {
    this._$element = $element;
    this._$timeout = $timeout;
    this.teamsUpdated = true;
    this._menu;
    this._textField;
  }

  $onChanges() {
    this._$timeout(() => {
      this.initializeOptions();
    })
  }

  $postLink() {
    this._$timeout(() => {
      this.initializeTypeahead()
    })
  }

  initializeTypeahead() {
    this.idPropery = this.idProperty|| 'id';
    this.displayProperty = this.displayProperty || 'name';
    this._textField = new textField.MDCTextField(this._$element.find('.mdc-text-field')[0])
    this._menu = new menuSurface.MDCMenuSurface(this._$element.find('.mdc-menu-surface')[0])
    this._menu.hoistMenuToBody()
    this.initializeOptions()
  }

  typeaheadChange() {
    this.openDropdown()
    this._$element.find('.mdc-text-field')[0].focus()
    var lowerCaseOption = this.selectedOptionDisplay.toLowerCase()
    this.sortedOptions = this.options.filter(option => option[this.displayProperty].toLowerCase().indexOf(lowerCaseOption) !== -1)
  }

  openDropdown() {
    if (!this._menu.isOpen()) {
      this._menu.open();
    }
  }

  setSelectedOption(option) {
    this._menu.close();
    this.selectedOption = option;
    this.selectedOptionDisplay = option.name;
    this._textField.value = this.selectedOptionDisplay;
    this.onSelect({event: option})
  }

  initializeOptions() {
    if (this._menu && this.options) {
      this.sortedOptions = this.options.sort((a, b) => {
        if (a[this.displayProperty] < b[this.displayProperty]) return -1;
        if (a[this.displayProperty] > b[this.displayProperty]) return 1;
        return 0;
      })
      if (this.initialValue) {
        this.setSelectedOption(this.filteredOptions().find(option => this.initialValue[this.displayProperty] === option[this.displayProperty]))
      }
    }
  }

  filteredOptions() {
    return this.sortedOptions;
  }
}

TypeaheadSelectController.$inject = ['$element', '$timeout'];

var template = require('./typeahead.select.component.html'),
bindings = {
  options: '<',
  initialValue: '<',
  fieldLabel: '@',
  idProperty: '@',
  displayProperty: '@',
  width: '@',
  onSelect: '&'
},
controller = TypeaheadSelectController

export {
  template,
  bindings,
  controller
}