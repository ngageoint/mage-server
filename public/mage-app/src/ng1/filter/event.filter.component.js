const MDCSelect = require('material-components-web').select.MDCSelect;
module.exports = {
  template: require('./event.filter.html'),
  bindings: {
    events: '<',
    onEventChosen: '&'
  },
  controller: EventFilterController
};



EventFilterController.$inject = ['$element'];

function EventFilterController($element) {
  console.log('events pictker', this.events);
  this.$onChanges = function() {
    console.log('event pictker');
    console.log('picker.events', this.events);
    if (this.events) {
      const selectMdc = new MDCSelect($element.find('.mdc-select')[0]);
      selectMdc.listen('MDCSelect:change', function() {
        this.onEventChosen(this.events[selectMdc.selectedIndex]);
      }.bind(this));
    }
  };
}
