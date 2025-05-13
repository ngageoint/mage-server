var MDCSelect = require('material-components-web').select.MDCSelect;

module.exports = {
  template: require('./multiselect.component.html'),
  bindings: {
    options: '<',
    initialValues: '<',
    fieldLabel: '@',
    idProperty: '@',
    displayProperty: '@',
    width: '@',
    onSelect: '&'
  },
  controller: MultiselectController
};

MultiselectController.$inject = ['$element', '$timeout'];

function MultiselectController($element, $timeout) {
  var multiSelectMdc;
  this.teamsUpdated = true;

  this.$onChanges = function() {
    $timeout(function() {
      this.initializeOptions();
    }.bind(this));
  };

  this.$postLink = function() {
    $timeout(function() {
      this.initializeMultiSelect();
    }.bind(this));
  };
  this.initializeMultiSelect = function() {
    this.idPropery = this.idProperty|| 'id';
    this.displayProperty = this.displayProperty || 'name';
    multiSelectMdc = new MDCSelect($element.find('.multi-select')[0]);
    multiSelectMdc.listen('MDCSelect:change', function(event) {
      if (event.detail.index === -1) return;
      var newOptionId = event.detail.value;
      if (!isNaN(newOptionId)) newOptionId = Number(newOptionId);
      $timeout(function() {
        // figure out if this option is already selected before adding it
        var found = this.optionsSelected.find(function(selectedOption) {
          return selectedOption[this.idProperty] === newOptionId;
        }.bind(this));
        if (!found) {
          this.optionsSelected.push(this.filteredOptions().find(function(option) {
            return option[this.idProperty] === newOptionId;
          }.bind(this)));
        }
        this.onSelect({options:this.optionsSelected});
        
      }.bind(this));
    }.bind(this));
    this.initializeOptions();
  };

  this.initializeOptions = function() {
    if (multiSelectMdc && this.options) {
      this.sortedOptions = this.options.sort(function(a, b) {
        if (a[this.displayProperty] < b[this.displayProperty]) return -1;
        if (a[this.displayProperty] > b[this.displayProperty]) return 1;
        return 0;
      }.bind(this));
      this.optionsSelected = this.optionsSelected || (this.initialValues || []);
      multiSelectMdc.selectedIndex = -1;
      var finalIndex = -1;
      this.optionsSelected = this.optionsSelected.filter(function(selectedOption) {
        for (var i = 0; i < this.filteredOptions().length; i++) {
          if (selectedOption[this.idProperty] === this.filteredOptions()[i][this.idProperty]) {
            finalIndex = i;
            return true;
          }
        }
        return false;
      }.bind(this));
      $timeout(function() {
        multiSelectMdc.selectedIndex = finalIndex;
      });
    }
  };

  this.filteredOptions = function() {
    return this.sortedOptions;
  };

  this.removeOption = function(index) {
    this.optionsSelected.splice(index, 1);
    if (!this.optionsSelected.length) {
      multiSelectMdc.selectedIndex = -1;
    }
    this.onSelect({options:this.optionsSelected});
  };

  this.isOptionChosen = function(optionId) {
    return this.optionsSelected && this.optionsSelected.find(function(option) {
      return option[this.idProperty] === optionId;
    }.bind(this));
  };
}
