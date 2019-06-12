const MDCSelect = require('material-components-web').select.MDCSelect;

module.exports = {
  template: require('./event.filter.html'),
  bindings: {
    events: '<',
    onEventChosen: '&'
  },
  controller: EventFilterController
};

var angular = require('angular');

EventFilterController.$inject = ['$element'];

function EventFilterController($element) {
  console.log('events pictker', this.events)
  this.$onChanges = function() {
    console.log('event pictker')
    console.log('picker.events', this.events)
    if (this.events) {
      const selectMdc = new MDCSelect($element.find('.mdc-select')[0])
      selectMdc.listen('MDCSelect:change', () => {
        // $scope.$apply(() => {
          console.log('selected', selectMdc.selectedIndex);
          this.onEventChosen(this.events[selectMdc.selectedIndex])
          // $scope.filterEvent.selected = selectMdc.selectedIndex
        // })
      })
    }
  }
  // this.$onInit = function() {
  //   const selectMdc = new MDCSelect($element.find('.mdc-select')[0])
  //   selectMdc.listen('MDCSelect:change', () => {
  //     // $scope.$apply(() => {
  //       console.log('selected', selectMdc.selectedIndex);
  //       // $scope.filterEvent.selected = selectMdc.selectedIndex
  //     // })
  //   })
  // };
}
