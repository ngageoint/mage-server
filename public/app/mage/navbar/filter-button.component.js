module.exports = {
  template: require('./filter-button.component.html'),
  bindings: {
  },
  controller: FilterButtonController
};

FilterButtonController.$inject = ['Event'];

function FilterButtonController(Event) {
  this.onFilterClick = function() {
    this.events = Event.query();
    this.filterOpen = {opened: true};
  };

  this.onFilterClose = function() {
    this.filterOpen = {opened: false};
    console.log('filter open false')
  }
}