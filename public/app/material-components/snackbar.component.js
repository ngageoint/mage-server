import {snackbar} from 'material-components-web';

class SnackbarController {

  constructor($element, $timeout) {
    this.$element = $element;
    this.$timeout = $timeout;
  }

  $postLink() {
    this.snackbar = new snackbar.MDCSnackbar(this.$element.find('.mdc-snackbar')[0]);

    if (this.onClose) {
      var onClose = this.onClose;
      this.snackbar.listen('MDCSnackbar:closed', function() {
        this.$timeout(function() {
          onClose();
        });
      }.bind(this));
    }
  }

  $onChanges(changes) {
    if (changes.options.currentValue) {
      this.snackbar.open();
    }

    // TODO detect changes that affect this.snackbar component
  }

  $onDestroy() {
    this.snackbar.destroy();
  }
}

SnackbarController.$inject = ['$element', '$timeout'];

var template = require('./snackbar.component.html'),
  bindings = {
    options: '<',
    onClose: '&'
  },
  controller = SnackbarController;

export {
  template,
  bindings,
  controller
};
