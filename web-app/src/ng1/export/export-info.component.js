'use strict';

const MDCDialog = require('material-components-web').dialog.MDCDialog
  , MDCSelect = require('material-components-web').select.MDCSelect
  , MDCChipSet = require('material-components-web').chips.MDCChipSet
  , moment = require('moment')
  , angular = require('angular');

function ExportInfoController($element, $timeout, FilterService) {
    this.exportInfoPanel;

    this.$onChanges = function () {
        if (this.events) {
            if (this.open && this.open.opened && this.exportInfoPanel && !this.exportInfoPanel.isOpen) {
                this.exportInfoPanel.open();
            }
        }
    };

    this.$postLink = function () {
        $timeout(() => this.initialize());
    };

    this.$onDestroy = function () {
        this.exportInfoPanel.destroy();
    };

    this.initialize = function () {
        this.exportInfoPanel = new MDCDialog(angular.element.find('.export-info-panel')[0]);
        this.exportInfoPanel.listen('MDCDialog:closing', () => {
            this.onExportClose();
        });
        this.exportInfoPanel.listen('MDCDialog:opening', () => {
            this.exportEvent = { selected: FilterService.getEvent() };
            this.initializeEventPanel();
        });

        if (this.events) {
            if (this.open && this.open.opened && !this.exportInfoPanel.isOpen) {
                this.exportInfoPanel.open();
            }
        }
    };

    this.initializeEventPanel = function() {
    };
}

module.exports = {
    template: require('./export-info.html'),
    bindings: {
        myself: '<',
        open: '<',
        events: '<',
        onExportClose: '&'
    },
    controller: ExportInfoController
};

ExportInfoController.$inject = ['$element', '$timeout', 'FilterService'];