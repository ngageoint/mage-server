var $ = require('jquery')
  , MDCDialog = require('material-components-web').dialog.MDCDialog
  , MDCSelect = require('material-components-web').select.MDCSelect
  , MDCCheckbox = require('material-components-web').checkbox.MDCCheckbox
  , MDCFormField = require('material-components-web').formField.MDCFormField
  , moment = require('moment');

  module.exports = {
    template: require('./export.html'),
    bindings: {
      open: '<',
      events: '<',
      onExportClose: '&'
    },
    controller: ExportController
  };

ExportController.$inject = ['LocalStorageService', 'FilterService', '$timeout', '$element'];

function ExportController(LocalStorageService, FilterService, $timeout, $element) {
  var exportPanel;
  var eventSelectMdc;
  var intervalSelectMdc;

  this.$onChanges = function() {
    if (this.events) {
      if (this.open && this.open.opened && !exportPanel.isOpen) {
        exportPanel.open();
      }
    }    
  }.bind(this)

  this.$onInit = function() {
    
    exportPanel = new MDCDialog(angular.element.find('.export-panel')[0])
    exportPanel.listen('MDCDialog:closing', function() {
      this.onExportClose()
    }.bind(this))
    exportPanel.listen('MDCDialog:opening', function() {
      this.exportEvent = {selected: FilterService.getEvent()};
      this.initializeEventPanel()
    }.bind(this))
  }

  this.initializeEventPanel = function() {
    if (this.events && !this.eventSelectMdc) {
      $timeout(function() {
        intervalSelectMdc = new MDCSelect($element.find('.interval-select')[0])
        intervalSelectMdc.listen('MDCSelect:change', function(event) {
          $timeout(function() {
            this.exportTime = this.exportOptions.find(function(choice) {
              return choice.label === event.detail.value
            })
          }.bind(this))
        }.bind(this))
        eventSelectMdc = new MDCSelect($element.find('.event-select')[0])
        eventSelectMdc.listen('MDCSelect:change', function(event) {
          var eventId = event.detail.value;
          $timeout(function(){ 
            eventId = Number(eventId)
            this.exportEvent.selected = this.events.find(function(value, index) {
              return value.id === eventId;
            })
          }.bind(this))
        }.bind(this))
      }.bind(this))
    }
  }

  this.exportLocations = {value: true};
  this.exportObservations = {value: true};
  this.exportFavoriteObservations = {value: false};
  this.exportImportantObservations = {value: false};
  this.exportObservationsWithAttachments = {value: false};

  this.localOffset = moment().format('Z');
  this.localTime = true;

  this.startDate = moment().startOf('day').toDate();
  this.endDate = moment().endOf('day').toDate();

  this.startDatePopup = {open: false};
  this.endDatePopup = {open: false};

  /* Export existing points to  */
  this.exportOptions = [{
    value: 300,
    label: 'Last 5 minutes'
  },{
    value: 3600,
    label: 'Last Hour'
  },{
    value: 43200,
    label: 'Last 12 Hours'
  },{
    value: 86400,
    label: 'Last 24 Hours'
  },{
    all: true,
    value: null,
    label: 'All  (Use With Caution)'
  },{
    custom: true,
    value: null,
    label: 'Custom (Choose your own start/end)'
  }];
  this.exportTime = this.exportOptions[0];

  this.onStartDate = function(date, localTime) {
    this.startDate = date;
    this.localTime = localTime;
  }

  this.onEndDate = function(date, localTime) {
    this.endDate = date;
    this.localTime = localTime;
  }

  this.exportData = function($event, type) {
    if (!this.exportEvent.selected) {
      $event.preventDefault();
      this.showEventError = true;
      return false;
    }

    this.showEventError = false;

    var start;
    if (this.exportTime.custom) {
      var startDate = moment(this.startDate);
      if (startDate) {
        startDate = this.localTime ? startDate.utc() : startDate;
        start = startDate.format("YYYY-MM-DD HH:mm:ss");
      }

      var endDate = moment(this.endDate);
      if (endDate) {
        endDate = this.localTime ? endDate.utc() : endDate;
        var end = endDate.format("YYYY-MM-DD HH:mm:ss");
      }
    } else if (this.exportTime.value) {
      start = moment().subtract('seconds', this.exportTime.value).utc().format("YYYY-MM-DD HH:mm:ss");
    }

    var params = {
      eventId: this.exportEvent.selected.id,
      observations: this.exportObservations.value,
      locations: this.exportLocations.value,
      access_token: LocalStorageService.getToken() //eslint-disable-line camelcase
    };

    if (start) params.startDate = start;
    if (end) params.endDate = end;

    if (this.exportObservations.value) {
      params.attachments = this.exportObservationsWithAttachments.value;
      params.favorites = this.exportFavoriteObservations.value;
      params.important = this.exportImportantObservations.value;
    }
    var url = "api/" + type + "?" + $.param(params);
    $.fileDownload(url)
      .done(function() {
      })
      .fail(function() {
      });
  };
}
