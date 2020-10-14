'use strict';

const MDCDialog = require('material-components-web').dialog.MDCDialog
    , MDCChipSet = require('material-components-web').chips.MDCChipSet
    , angular = require('angular');

function ExportInfoController($element, $filter, $timeout, FilterService, ExportService) {
    this.exportInfoPanel;
    this.chipSet;
    this.allExports = [];
    this.filteredExports = [];
    this.exportOpen = { opened: false };
    this.pagedExports = [];
    this.page = 1;
    this.numItemsPerPage = 4;

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
        this.chipSet = new MDCChipSet($element.find('.mdc-chip-set')[0]);
        this.exportInfoPanel = new MDCDialog(angular.element.find('.export-info-panel')[0]);
        this.exportInfoPanel.listen('MDCDialog:closing', () => {
            this.onExportClose();
            this.exportOpen = { opened: false };
        });
        this.exportInfoPanel.listen('MDCDialog:opening', () => {
            this.exportOpen = { opened: false };
            this.exportEvent = { selected: FilterService.getEvent() };
            this.getExports();
        });

        this.chipSet.listen('MDCChip:selection', event => {
            this.filter();
        });

        if (this.events) {
            if (this.open && this.open.opened && !this.exportInfoPanel.isOpen) {
                this.exportInfoPanel.open();
            }
        }
    };

    this.getExports = function () {
        this.allExports.splice(0, this.allExports.length);

        ExportService.getAllExports().then(response => {
            for (const e of response.data) {
                this.allExports.push(e);
            }
            this.filter();
        }).catch(err => {
            console.log(err);
        });
    };

    this.filter = function () {
        this.filteredExports.splice(0, this.filteredExports.length);
        for (const ex of this.allExports) {
            if (this.matchesFilters(ex)) {
                this.filteredExports.push(ex);
            }
        }
        this.applyPaging();
    };

    this.applyPaging = function () {
        this.pagedExports.splice(0, this.pagedExports.length);

        const startIdx = this.numItemsPerPage * (this.page - 1);

        let endIdx = this.filteredExports.length;
        if (startIdx + this.numItemsPerPage < this.filteredExports.length) {
            endIdx = startIdx + this.numItemsPerPage;
        }

        for (let i = startIdx; i < endIdx; i++) {
            this.pagedExports.push(this.filteredExports[i]);
        }

    };

    this.matchesFilters = function (ex) {
        let matches = true;
        for (const chip of this.chipSet.chips) {
            if (chip.id === 'completed-exports-chip') {
                if (chip.selected === true) {
                    if (ex.status !== 'Completed') {
                        matches = false;
                        break;
                    }
                }
            } else if (chip.id === 'my-exports-chip') {
                if (chip.selected === true) {
                    if (ex.userId.displayName !== this.myself.displayName) {
                        matches = false;
                        break;
                    }
                }
            }
        }
        return matches;
    }

    this.openExport = function () {
        this.exportOpen = { opened: true };
    }
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

ExportInfoController.$inject = ['$element', '$filter', '$timeout', 'FilterService', 'ExportService'];