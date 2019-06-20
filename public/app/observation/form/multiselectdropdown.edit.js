module.exports = {
  template: require('./multiselectdropdown.edit.html'),
  bindings: {
    field: '<'
  },
  controller: function($scope, $element) {
    this.$onChanges = function() {
      this.initialSelectedOptions = []
      if (this.field.value) {
        this.field.value.forEach(function(value) {
          for (var i = 0; i < this.field.choices.length; i++) {
            if (this.field.choices[i].title === value) {
              this.initialSelectedOptions.push(this.field.choices[i]);
            }
          }
        }.bind(this))
      }
    }

    this.optionsSelected = function(options) {
      var values = [];
      options.forEach(function(option) {
        values.push(option.title);
      });
      this.field.value = values;
    }
  }
};
