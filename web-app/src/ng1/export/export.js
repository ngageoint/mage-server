const MDCDialog = require('material-components-web').dialog.MDCDialog
  , MDCSelect = require('material-components-web').select.MDCSelect
  , MDCChipSet = require('material-components-web').chips.MDCChipSet
  , moment = require('moment')
  , angular = require('angular');

function ExportController(LocalStorageService, FilterService, $timeout, $element, $httpParamSerializer) {
  this.exportPanel;
  this.intervalSelectMdc;
  this.chipSet;

  this.exportLocations = { value: true };
  this.exportObservations = { value: true };
  this.exportFavoriteObservations = { value: false };
  this.exportImportantObservations = { value: false };
  this.excludeObservationsAttachments = { value: false };
  this.advancedOptionsExpanded = { value: false };

  this.localOffset = moment().format('Z');
  this.localTime = true;

  this.startDate = moment().startOf('day').toDate();
  this.endDate = moment().endOf('day').toDate();

  this.startDatePopup = { open: false };
  this.endDatePopup = { open: false };

  this.type = { value: 'kml' };

  /* Export existing points to  */
  this.exportOptions = [{
    value: 300,
    label: 'Last 5 minutes'
  }, {
    value: 3600,
    label: 'Last Hour'
  }, {
    value: 43200,
    label: 'Last 12 Hours'
  }, {
    value: 86400,
    label: 'Last 24 Hours'
  }, {
    all: true,
    value: null,
    label: 'All  (Use With Caution)'
  }, {
    custom: true,
    value: null,
    label: 'Custom (Choose your own start/end)'
  }];
  this.exportTime = this.exportOptions[0];

  this.$onChanges = function() {
    if (this.events) {
      if (this.open && this.open.opened && this.exportPanel && !this.exportPanel.isOpen) {
        this.exportPanel.open();
      }
    }    
  }

  this.$postLink = function() {
    $timeout(() => this.initialize());
  };

  this.$onDestroy = function() {
    this.exportPanel.destroy();
    this.intervalSelectMdc.destroy();
    this.chipSet.destroy();
  }

  this.initialize = function() {
    this.chipSet = new MDCChipSet($element.find('.mdc-chip-set')[0]);
    this.intervalSelectMdc = new MDCSelect($element.find('.interval-select')[0]);

    this.exportPanel = new MDCDialog(angular.element.find('.export-panel')[0]);
    this.exportPanel.listen('MDCDialog:closing', () => {
      this.onExportClose();
    });
    this.exportPanel.listen('MDCDialog:opening', () => {
      this.exportEvent = { selected: FilterService.getEvent() };
      this.initializeEventPanel();
    });

    if (this.events) {
      if (this.open && this.open.opened && !this.exportPanel.isOpen) {
        this.exportPanel.open();
      }
    }  
  }

  this.initializeEventPanel = function() {
    if (this.events) {
      $timeout(() => {
        this.intervalSelectMdc.listen('MDCSelect:change', event => {
          $timeout(() => {
            this.exportTime = this.exportOptions.find(choice => {
              return choice.label === event.detail.value;
            });
          });
        });
      });
    }
  };

  this.onStartDate = function(date, timeZone) {
    this.startDate = date;
    this.localTime = timeZone === 'local';
  };

  this.onEndDate = function(date, timeZone) {
    this.endDate = date;
    this.localTime = timeZone === 'local';
  };

  this.exportData = function($event) {
    if (!this.exportEvent.selected) {
      $event.preventDefault();
      this.showEventError = true;
      return false;
    }

    this.showEventError = false;

    let start;
    let end;
    if (this.exportTime.custom) {
      let startDate = moment(this.startDate);
      if (startDate) {
        startDate = this.localTime ? startDate.utc() : startDate;
        start = startDate.format("YYYY-MM-DD HH:mm:ss");
      }

      let endDate = moment(this.endDate);
      if (endDate) {
        endDate = this.localTime ? endDate.utc() : endDate;
        end = endDate.format("YYYY-MM-DD HH:mm:ss");
      }
    } else if (this.exportTime.value) {
      start = moment().subtract('seconds', this.exportTime.value).utc().format("YYYY-MM-DD HH:mm:ss");
    }

    const params = {
      eventId: this.exportEvent.selected.id,
      observations: this.exportObservations.value,
      locations: this.exportLocations.value,
      access_token: LocalStorageService.getToken() //eslint-disable-line camelcase
    };

    if (start) params.startDate = start;
    if (end) params.endDate = end;

    if (this.exportObservations.value) {
      params.attachments = this.excludeObservationsAttachments.value;
      params.favorites = this.exportFavoriteObservations.value;
      params.important = this.exportImportantObservations.value;
    }
    const url = "api/export/" + this.type.value + "?" + $httpParamSerializer(params);
    jQuery.fileDownload(url)
      .done(function() {})
      .fail(function() {});
  };
}

module.exports = {
  template: require('./export.html'),
  bindings: {
    open: '<',
    events: '<',
    onExportClose: '&'
  },
  controller: ExportController
};

ExportController.$inject = ['LocalStorageService', 'FilterService', '$timeout', '$element', '$httpParamSerializer'];
