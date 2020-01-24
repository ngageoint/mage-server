module.exports = {
  template: require('./filter-button.component.html'),
  bindings: {
    drawer: '<'
  },
  controller: FilterButtonController
};

FilterButtonController.$inject = ['Event'];

function FilterButtonController(Event) {
  this.onFilterClick = function() {
    Event.query().$promise.then(function(events) {
      this.events = events; 
    }.bind(this));
    this.filterOpen = {opened: true};
  };

  this.onFilterClose = function() {
    this.filterOpen = {opened: false};
  };
}