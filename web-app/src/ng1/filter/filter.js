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

FilterController.$inject = ['FilterService', '$element', '$timeout'];

function FilterController(FilterService, $element, $timeout) {
  this.filterPanel;

  this.teamSelectMdc;
  this.intervalSelectMdc;
  this.teamsUpdated = true;

  this.$onChanges = function() {
    this.filterEvent = {selected: FilterService.getEvent()};
    this.filterTeams = {selected: FilterService.getTeams()};
    this.interval = FilterService.getInterval();
  
    this.intervalChoices = FilterService.intervals;
    this.intervalChoice = FilterService.getIntervalChoice();
    this.localTime = true;

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
    if (this.events) {
      if (this.open && this.open.opened && !this.filterPanel.isOpen) {
        this.filterPanel.open();
      }
    }    
  }.bind(this);

  this.$onInit = function() {
    this.filterPanel = new MDCDialog($element.find('.filter-panel')[0]);
    this.filterPanel.listen('MDCDialog:closing', function() {
      this.onFilterClose();
    }.bind(this));
    this.filterPanel.listen('MDCDialog:opening', function() {
      if (!this.intervalSelectMdc) {
        $timeout(function() {
          this.intervalSelectMdc = new MDCSelect($element.find('.interval-select')[0]);
          this.intervalSelectMdc.listen('MDCSelect:change', function(event) {
            $timeout(function() {
              this.intervalChoice = this.intervalChoices.find(function(choice) {
                return choice.label === event.detail.value;
              });
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  };

  this.eventSelected = function(event) {
    this.filterEvent.selected = event;
    this.filterTeams.selected = [];
  };

  this.teamsSelected = function(teams) {
    this.filterTeams.selected = teams;
  };

  this.removeTeam = function(index) {
    this.filterTeams.selected.splice(index, 1);
    if (!this.filterTeams.selected.length) {
      this.teamSelectMdc.selectedIndex = -1;
    }
  };

  this.isTeamChosen = function(teamId) {
    return this.filterTeams.selected.find(function(team) {
      return team.id === teamId;
    });
  };

  this.onStartDate = function(date, localTime) {
    this.startDate = date;
    this.localTime = localTime;
  };

  this.onEndDate = function(date, localTime) {
    this.endDate = date;
    this.localTime = localTime;
  };

  this.onEventChange = function(eventId) {
    $timeout(function() {
      eventId = Number(eventId);
      this.filterEvent.selected = this.events.find(function(value) {
        return value.id === eventId;
      });
      this.filterTeams.selected = [];
    }.bind(this));
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
}
