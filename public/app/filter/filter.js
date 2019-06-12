var moment = require('moment')
  , MDCDialog = require('material-components-web').dialog.MDCDialog
  , MDCSelect = require('material-components-web').select.MDCSelect;

module.exports = {
  template: require('./filter.html'),
  bindings: {
    open: '<',
    events: '<',
    onFilterClose: '&'
  },
  controller: FilterController
};

FilterController.$inject = ['EventService', 'FilterService', 'Event', '$element', '$timeout'];

function FilterController(EventService, FilterService, Event, $element, $timeout) {
  var filterPanel;

  var teamSelectMdc;
  var timeSelectMdc;
  var eventSelectMdc;
  this.teamsUpdated = true;
  this.$onChanges = function() {
    if (this.open && this.open.opened && !filterPanel.isOpen) {
      filterPanel.open();
    }

    console.log('FilterController $onChanges')
    if (this.events) {
      this.filterEvent = {selected: FilterService.getEvent()};
      this.filterTeams = {selected: FilterService.getTeams()};
      if (!eventSelectMdc) {
        eventSelectMdc = new MDCSelect($element.find('.event-select')[0])
        eventSelectMdc.listen('MDCSelect:change', function(event) {
          var eventId = event.detail.value;
          this.onEventChange(eventId)
        }.bind(this))

        teamSelectMdc = new MDCSelect($element.find('.team-select')[0])
        teamSelectMdc.listen('MDCSelect:change', function() {
          console.log('team selected', teamSelectMdc.selectedIndex);
          // this.onEventChange(this.events[selectMdc.selectedIndex])
        }.bind(this))

        timeSelectMdc = new MDCSelect($element.find('.time-select')[0])
        timeSelectMdc.listen('MDCSelect:change', function() {
          console.log('time selected', timeSelectMdc.selectedIndex);
          $timeout(function() {
            this.intervalChoice = this.intervalChoices[timeSelectMdc.selectedIndex];
          }.bind(this))
        }.bind(this))
      }

      console.log('this.filterEvent', this.filterEvent)
    }
  }.bind(this)

  this.$onInit = function() {
    filterPanel = new MDCDialog(angular.element.find('.filter-panel')[0])
    filterPanel.listen('MDCDialog:closing', function() {
      console.log('closing')
      this.onFilterClose()
    }.bind(this))
  
    this.interval = FilterService.getInterval();
    
    this.intervalChoices = FilterService.intervals;
    this.intervalChoice = FilterService.getIntervalChoice();
    this.localTime = true;
    this.localOffset = moment().format('Z');

    if (this.interval.options && this.interval.options.startDate) {
      this.startDate = this.interval.options.startDate;
    } else {
      this.startDate = moment().startOf('day').toDate();
    }
    if (this.interval.options && this.interval.options.endDate) {
      this.endDate = this.interval.options.endDate;
    } else {
      this.endDate = moment().endOf('day').toDate();
    }

    this.startDatePopup = {open: false};
    this.endDatePopup = {open: false};
  }

  this.onEventChange = function(eventId) {
    $timeout(function() {
      eventId = Number(eventId)
      this.filterEvent.selected = this.events.find(function(value, index) {
        return value.id === eventId;
      })
      teamSelectMdc.selectedIndex = -1;
      this.filterTeams = {};
    }.bind(this))
  };

  this.performFilter = function() {
    var options = {};
    if (this.intervalChoice.filter === 'custom') {
      options.startDate = this.startDate;
      options.endDate = this.endDate;
      options.localTime = this.localTime;
    }

    FilterService.setFilter({
      event: this.filterEvent.selected,
      teams: this.filterTeams.selected,
      timeInterval: {
        choice: this.intervalChoice,
        options: options
      }
    });

  };

  this.openStartDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    this.startDatePopup.open = true;
  };

  this.openEndDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    this.endDatePopup.open = true;
  };
}
