var moment = require('moment')
  , MDCSelect = require('material-components-web').select.MDCSelect;

module.exports = {
  template: require('./multiselect.component.html'),
  bindings: {
    options: '<',
    fieldLabel: '@',
    idProperty: '@',
    displayProperty: '@',
    onSelect: '&'
  },
  controller: MultiselectController
};

MultiselectController.$inject = ['$element', '$timeout'];

function MultiselectController($element, $timeout) {
  var multiSelectMdc;
  this.teamsUpdated = true;
  this.optionsSelected = []
  this.$onChanges = function() {
    this.initializeMultiSelect();
  }.bind(this)

  this.$onInit = function() {
    this.initializeMultiSelect();
  }

  this.initializeMultiSelect = function() {
    if (!multiSelectMdc && this.options) {
      this.idPropery = this.idProperty|| 'ida';
      this.displayProperty = this.displayProperty || 'namea';
      multiSelectMdc = new MDCSelect($element.find('.multi-select')[0])
      multiSelectMdc.listen('MDCSelect:change', function(event) {
        if (event.detail.index === -1) return;
        var newOptionId = event.detail.value;
        $timeout(function() {
          // figure out if this option is already selected before adding it
          var found = this.optionsSelected.find(function(selectedOption) {
            return selectedOption.id === newOptionId;
          }.bind(this))
          if (!found) {
            this.optionsSelected.push(this.options.find(function(option) {
              return option.id === newOptionId
            }))
          }
          this.onSelect({options:this.optionsSelected});
          
        }.bind(this))
      }.bind(this))
    }
    if (this.options) {
      multiSelectMdc.selectedIndex = -1
      this.optionsSelected = this.optionsSelected.filter(function(selectedOption, index) {
        var found = this.options.find(function(option) {
          return selectedOption.id === option.id;
        })
        if (found) {
          multiSelectMdc.selectedIndex = index;
        }
      }.bind(this))
    }
  }

  this.filteredOptions = function() {
    return this.options;
  }

  this.removeOption = function(index) {
    this.optionsSelected.splice(index, 1);
    if (!this.optionsSelected.length) {
      multiSelectMdc.selectedIndex = -1;
    }
    this.onSelect({options:this.optionsSelected});
  }

  this.isOptionChosen = function(optionId) {
    console.log('isOptionChosen', optionId)
    return this.optionsSelected.find(function(option) {
      return option.id === optionId;
    })
  }
}
