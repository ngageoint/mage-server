var _ = require('underscore')
  , moment = require('moment')
  , MDCSelect = require('material-components-web').select.MDCSelect
  , MDCChipSet = require('material-components-web').chips.MDCChipSet;

module.exports = {
  template: require('./observation-feed.component.html'),
  controller: ObservationFeedController,
  bindings: {
    onCreateNewObservation: '&'
  }
};

ObservationFeedController.$inject = ['$element', '$timeout', 'EventService', '$filter', 'FilterService'];

function ObservationFeedController($element, $timeout, EventService, $filter, FilterService) {

  let observationSelectMdc;

  this.event = FilterService.getEvent();

  this.feedObservations = [];
  this.feedChangedObservations = {count: 0};

  var observationsById = {};
  var firstObservationChange = true;

  this.currentObservationPage = 0;
  this.observationsChanged = 0;
  this.observationPages = null;
  var observationsPerPage = 100;

  this.actionFilter = 'all';

  this.calculateObservationPages = function(observations) {
    if (!observations) return;

    // sort the observations
    observations = $filter('orderBy')(observations, function(observation) {
      return moment(observation.properties.timestamp).valueOf() * -1;
    });

    // slice into pages
    var pages = [];
    for (var i = 0, j = observations.length; i < j; i += observationsPerPage) {
      pages.push(observations.slice(i, i + observationsPerPage));
    }

    this.observationPages = pages;
    // if a new page showed up that wasn't there before, switch to it
    if (this.currentObservationPage === -1 && pages.length) {
      this.currentObservationPage = 0;
    }
    // ensure the page that they were on did not go away
    this.currentObservationPage = Math.min(this.currentObservationPage, pages.length - 1);
    $timeout(function() {
      if (!observationSelectMdc) {
        observationSelectMdc = new MDCSelect($element.find('.observation-select')[0]);
        observationSelectMdc.listen('MDCSelect:change', function() {
          $timeout(function() {
            this.currentObservationPage = observationSelectMdc.selectedIndex;
          }.bind(this));
        }.bind(this)); 
      }
      observationSelectMdc.selectedIndex = this.currentObservationPage;
    }.bind(this));
  };

  this.onObservationsChanged = function(changed) {
    this.event = FilterService.getEvent();
    _.each(changed.added, function(added) {
      observationsById[added.id] = added;
    });

    _.each(changed.updated, function(updated) {
      observationsById[updated.id] = updated;
    });

    _.each(changed.removed, function(removed) {
      delete observationsById[removed.id];
    });

    // update the news feed observations
    this.feedObservations = _.values(observationsById);

    if (!firstObservationChange) {
      if (changed.added) this.feedChangedObservations.count += changed.added.length;
      if (changed.updated) this.feedChangedObservations.count += changed.updated.length;
    }

    firstObservationChange = false;

    this.calculateObservationPages(this.feedObservations);
  };

  this.onFilterChanged = function() {
    this.currentObservationPage = 0;
  };

  this.actionFilterChanged = function(actionFilter) {
    this.actionFilter = actionFilter;
    FilterService.setFilter({actionFilter: actionFilter});
  };

  this.$postLink = function() {
    new MDCChipSet($element.find('.mdc-chip-set')[0]);

    var observationsChangedListener = {
      onObservationsChanged: this.onObservationsChanged.bind(this)
    };
    EventService.addObservationsChangedListener(observationsChangedListener);

    var filterChangedListener = {
      onFilterChanged: this.onFilterChanged.bind(this)
    };
    FilterService.addListener(filterChangedListener);
  };
}